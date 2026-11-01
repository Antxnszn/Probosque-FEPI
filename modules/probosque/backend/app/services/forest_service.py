import json
import pathlib
import urllib.request
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import yaml

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.forest import GeoRegion, DataSource, LandCoverClass, RasterProduct, RegionYearStat
from app.schemas.forest import (
    ForestMetadataResponse,
    DataSourceInfo,
    LegendClass,
    RegionSummary,
    RegionDetail,
    AnnualStatsResponse,
    AnnualStatsSeries,
    AnnualClassStat,
    LossStatsResponse,
    LossStatsYear,
    TransitionStatsResponse,
    LayerSpec,
)


class ForestService:
    def __init__(self):
        # Resolve module and repo directories
        self.module_dir = pathlib.Path(__file__).resolve().parent.parent.parent.parent
        self.base_dir = self.module_dir.parent.parent if self.module_dir.parent.name == "modules" else self.module_dir

        # Resolve config dir: custom setting -> module/repo pipelines/configs -> /pipelines/configs -> app/configs
        if settings.CONFIG_DIR and pathlib.Path(settings.CONFIG_DIR).exists():
            self.config_dir = pathlib.Path(settings.CONFIG_DIR)
        elif (self.module_dir / "pipelines" / "configs").exists():
            self.config_dir = self.module_dir / "pipelines" / "configs"
        elif (self.base_dir / "pipelines" / "configs").exists():
            self.config_dir = self.base_dir / "pipelines" / "configs"
        elif pathlib.Path("/pipelines/configs").exists():
            self.config_dir = pathlib.Path("/pipelines/configs")
        else:
            self.config_dir = pathlib.Path(__file__).resolve().parent.parent / "configs"

        # Resolve data dir: custom setting -> volume /data/inegi -> base_dir/data/inegi -> app/data/inegi
        if settings.DATA_DIR and pathlib.Path(settings.DATA_DIR).exists():
            self.data_dir = pathlib.Path(settings.DATA_DIR)
        elif (self.base_dir / "data" / "probosque" / "inegi").exists():
            self.data_dir = self.base_dir / "data" / "probosque" / "inegi"
        elif (self.base_dir / "data" / "inegi").exists():
            self.data_dir = self.base_dir / "data" / "inegi"
        elif pathlib.Path("/data/inegi").exists():
            self.data_dir = pathlib.Path("/data/inegi")
        else:
            self.data_dir = pathlib.Path(__file__).resolve().parent.parent / "data" / "inegi"

        self._metadata_cache: Optional[ForestMetadataResponse] = None
        self._catalog_cache: Optional[List[RegionSummary]] = None
        self._feature_map: Dict[str, Dict[str, Any]] = {}
        self._state_data: Optional[Dict[str, Any]] = None
        self._tile_cache: Dict[int, Dict[str, Any]] = {}

    def _load_configs(self):
        if self._metadata_cache is not None:
            return

        sources_file = self.config_dir / "data_sources.yaml"
        classes_file = self.config_dir / "edomex_forest_classes.yaml"

        sources_data = {}
        if sources_file.exists():
            sources_data = yaml.safe_load(sources_file.read_text(encoding="utf-8")).get("sources", {})

        legend_data = {}
        if classes_file.exists():
            legend_data = yaml.safe_load(classes_file.read_text(encoding="utf-8"))

        legend_classes = [
            LegendClass(
                code=c["code"],
                name_es=c["name_es"],
                name_en=c["name_en"],
                hex_color=c["hex_color"],
                is_forest=c["is_forest"],
                is_native_forest=c.get("is_native_forest", False),
                is_forest_approved=c.get("is_forest_approved", False),
                description=c.get("description"),
            )
            for c in legend_data.get("classes", [])
        ]

        sources_map = {
            k: DataSourceInfo(
                key=v.get("key", k),
                provider=v.get("provider", ""),
                product=v.get("product", ""),
                collection_version=v.get("collection_version", v.get("version", "1.0")),
                asset_id=v.get("asset_id", ""),
                first_year=v.get("first_year", 2010),
                last_year=v.get("last_year", 2025),
                mvp_first_year=v.get("mvp_first_year", 2010),
                mvp_last_year=v.get("mvp_last_year", 2025),
                resolution_m=float(v.get("resolution_m", 30.0)),
                license=v.get("license", ""),
                citation=v.get("citation", ""),
                methodology_url=v.get("methodology_url"),
            )
            for k, v in sources_data.items()
        }

        years = list(range(2010, 2026))

        self._metadata_cache = ForestMetadataResponse(
            years_available=years,
            sources=sources_map,
            legend_classes=legend_classes,
            forest_grouping_version=legend_data.get("forest_grouping_version", "probosque-v1.0"),
        )

    def get_metadata(self) -> ForestMetadataResponse:
        self._load_configs()
        return self._metadata_cache

    def get_municipalities(self) -> List[RegionSummary]:
        if self._catalog_cache is not None:
            return self._catalog_cache

        catalog_path = self.data_dir / "edomex_municipios_catalog.json"
        if not catalog_path.exists():
            return []

        raw_list = json.loads(catalog_path.read_text(encoding="utf-8"))
        self._catalog_cache = [
            RegionSummary(
                inegi_code=item["inegi_code"],
                cve_mun=item["cve_mun"],
                name=item["name"],
                area_ha=item["area_ha"],
                bbox=item["bbox"],
                center=item["center"],
            )
            for item in raw_list
        ]
        return self._catalog_cache

    def get_region_detail(self, region_id: str) -> Optional[RegionDetail]:
        # Check if region is state
        if region_id in ["15", "MEX", "edomex"]:
            state_geojson = self.get_state_geojson(simplified=True)
            if not state_geojson or not state_geojson.get("features"):
                return None
            f = state_geojson["features"][0]
            p = f["properties"]
            return RegionDetail(
                inegi_code="15",
                cve_mun="000",
                name="Estado de México",
                area_ha=p.get("area_ha", 2235175.16),
                bbox=p.get("bbox", [-100.6131, 18.3669, -98.5969, 20.2859]),
                center=[19.35, -99.65],
                type="state",
                parent_code="MEX",
                geometry=f.get("geometry"),
            )

        # Municipality
        mun_list = self.get_municipalities()
        match = next((m for m in mun_list if m.inegi_code == region_id or m.cve_mun == region_id), None)
        if not match:
            return None

        # Load geometry from GeoJSON
        if not self._feature_map:
            geojson_path = self.data_dir / "edomex_125_municipios_simplified.geojson"
            if not geojson_path.exists():
                geojson_path = self.data_dir / "edomex_125_municipios.geojson"
            if geojson_path.exists():
                d = json.loads(geojson_path.read_text(encoding="utf-8"))
                for feat in d.get("features", []):
                    code = feat.get("properties", {}).get("inegi_code")
                    if code:
                        self._feature_map[code] = feat

        feat = self._feature_map.get(match.inegi_code)
        geom = feat.get("geometry") if feat else None

        return RegionDetail(
            inegi_code=match.inegi_code,
            cve_mun=match.cve_mun,
            name=match.name,
            area_ha=match.area_ha,
            bbox=match.bbox,
            center=match.center,
            type="municipality",
            parent_code="15",
            geometry=geom,
        )

    def get_state_geojson(self, simplified: bool = True) -> Dict[str, Any]:
        fname = "edomex_state_simplified.geojson" if simplified else "edomex_state.geojson"
        path = self.data_dir / fname
        if not path.exists():
            path = self.data_dir / "edomex_state.geojson"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return {"type": "FeatureCollection", "features": []}

    def get_municipalities_geojson(self, simplified: bool = True) -> Dict[str, Any]:
        fname = "edomex_125_municipios_simplified.geojson" if simplified else "edomex_125_municipios.geojson"
        path = self.data_dir / fname
        if not path.exists():
            path = self.data_dir / "edomex_125_municipios.geojson"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return {"type": "FeatureCollection", "features": []}

    def _get_db_session(self):
        try:
            engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
            Session = sessionmaker(bind=engine)
            return Session()
        except Exception:
            return None

    def get_annual_stats(self, region_id: str, year_from: int = 2010, year_to: int = 2025) -> AnnualStatsResponse:
        self._load_configs()
        region_detail = self.get_region_detail(region_id)
        name = region_detail.name if region_detail else region_id

        # Query database for ingested statistics
        db_stats_by_year: Dict[int, Dict[int, float]] = {}
        session = self._get_db_session()
        if session:
            try:
                records = (
                    session.query(RegionYearStat)
                    .filter(
                        RegionYearStat.region_id == region_id,
                        RegionYearStat.year >= max(1985, year_from),
                        RegionYearStat.year <= min(2025, year_to),
                    )
                    .all()
                )
                for r in records:
                    if r.year not in db_stats_by_year:
                        db_stats_by_year[r.year] = {}
                    db_stats_by_year[r.year][r.class_code] = float(r.area_ha)
            except Exception:
                pass
            finally:
                session.close()

        has_data = len(db_stats_by_year) > 0
        series = []

        for y in range(max(2010, year_from), min(2025, year_to) + 1):
            year_data = db_stats_by_year.get(y)
            classes = []
            forest_ha_sum = 0.0

            for c in self._metadata_cache.legend_classes:
                if year_data is not None and c.code in year_data:
                    ha = year_data[c.code]
                    classes.append(
                        AnnualClassStat(
                            code=c.code,
                            name_es=c.name_es,
                            hex_color=c.hex_color,
                            area_ha=ha,
                            is_forest_approved=c.is_forest_approved,
                        )
                    )
                    if c.is_forest_approved:
                        forest_ha_sum += ha
                else:
                    # Ingested year exists but this class had 0 ha, or year is not ingested yet
                    classes.append(
                        AnnualClassStat(
                            code=c.code,
                            name_es=c.name_es,
                            hex_color=c.hex_color,
                            area_ha=0.0 if year_data is not None else None,
                            is_forest_approved=c.is_forest_approved,
                        )
                    )

            series.append(
                AnnualStatsSeries(
                    year=y,
                    total_forest_approved_ha=forest_ha_sum if year_data is not None else None,
                    classes=classes,
                )
            )

        return AnnualStatsResponse(
            region_id=region_id,
            region_name=name,
            indicator="land_cover_area_by_class",
            unit="ha",
            source={
                "key": "mapbiomas_mexico",
                "collection": "1.0",
                "resolution_m": 30,
            },
            series=series,
            data_status="ready" if has_data else "pending_ingest",
        )

    def get_loss_stats(self, region_id: str, year_from: int = 2010, year_to: int = 2025) -> LossStatsResponse:
        region_detail = self.get_region_detail(region_id)
        name = region_detail.name if region_detail else region_id

        series = [
            LossStatsYear(
                year=y,
                gross_tree_cover_loss_ha=None,
            )
            for y in range(max(2010, year_from), min(2025, year_to) + 1)
        ]

        return LossStatsResponse(
            region_id=region_id,
            region_name=name,
            indicator="gross_tree_cover_loss",
            unit="ha",
            source={
                "key": "hansen_gfc",
                "collection": "v1.13",
                "resolution_m": 30,
            },
            series=series,
            data_status="pending_ingest",
        )

    def get_transition_stats(self, region_id: str, year_from: int = 2010, year_to: int = 2025) -> TransitionStatsResponse:
        region_detail = self.get_region_detail(region_id)
        name = region_detail.name if region_detail else region_id

        return TransitionStatsResponse(
            region_id=region_id,
            region_name=name,
            year_from=year_from,
            year_to=year_to,
            source={
                "key": "mapbiomas_mexico",
                "collection": "1.0",
            },
            transitions=[],
            data_status="pending_ingest",
        )

    def _fetch_live_tile_url(self, year: int) -> Optional[str]:
        """
        Fetches or returns cached live Earth Engine XYZ tile URL template from MapBiomas México API.
        Tokens expire after 24-48 hours, so we cache with a 6-hour TTL and refresh automatically.
        """
        now = datetime.now(timezone.utc)
        cached = self._tile_cache.get(year)
        if cached and (now - cached["timestamp"]).total_seconds() < 21600:
            return cached["url"]

        leaf_pixels = [88, 89, 3, 5, 66, 45, 11, 15, 36, 19, 9, 21, 24, 25, 33, 34, 27]
        query = "&".join([f"pixelValue={v}" for v in leaf_pixels])
        url = f"https://prd.plataforma.mapbiomas.org/api/v1/mexico/maps/map?subthemeKey=coverage_lclu&legendKey=default&year={year}&{query}"
        headers = {"tenant-id": "mapbiomas", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                live_url = data.get("url")
                if live_url:
                    self._tile_cache[year] = {"url": live_url, "timestamp": now}
                    # Update database asynchronously / on session
                    session = self._get_db_session()
                    if session:
                        try:
                            rps = session.query(RasterProduct).filter_by(indicator="land_cover", year=year).all()
                            for rp in rps:
                                rp.tile_url_template = live_url
                                rp.status = "ready"
                                rp.produced_at = now
                            session.commit()
                        except Exception:
                            session.rollback()
                        finally:
                            session.close()
                    return live_url
        except Exception:
            pass

        return None

    def get_layers(self, indicator: Optional[str] = None, year: Optional[int] = None) -> List[LayerSpec]:
        self._load_configs()
        layers = []
        target_year = year or 2025

        # Query database for ready raster products or auto-refresh if token is stale
        tile_url = None
        layer_status = "pending_ingest"
        tile_strategy = "xyz"

        # Try live/cached refresh first so GEE tokens never expire
        live_tile_url = self._fetch_live_tile_url(target_year)
        if live_tile_url:
            tile_url = live_tile_url
            layer_status = "ready"
        else:
            session = self._get_db_session()
            if session:
                try:
                    rp = (
                        session.query(RasterProduct)
                        .filter_by(indicator="land_cover", year=target_year)
                        .first()
                    )
                    if rp and rp.status == "ready" and rp.tile_url_template:
                        tile_url = rp.tile_url_template
                        layer_status = "ready"
                        tile_strategy = rp.tile_strategy
                except Exception:
                    pass
                finally:
                    session.close()

        # Land cover layer
        legend_items = [
            {"code": c.code, "label": c.name_es, "color": c.hex_color}
            for c in self._metadata_cache.legend_classes
        ]

        layers.append(
            LayerSpec(
                id=f"land_cover_{target_year}",
                indicator="land_cover",
                name=f"Cobertura y Uso del Suelo {target_year} (MapBiomas Col. 1.0)",
                year=target_year,
                tile_strategy=tile_strategy,
                tile_url_template=tile_url,
                status=layer_status,
                legend=legend_items,
            )
        )

        layers.append(
            LayerSpec(
                id=f"hansen_loss_{target_year}",
                indicator="tree_cover_loss",
                name=f"Pérdida Bruta de Cobertura Arbórea (Hansen v1.13)",
                year=target_year,
                tile_strategy="xyz",
                tile_url_template=None,
                status="pending_ingest",
                legend=[{"label": "Año de pérdida (2001-2025)", "color": "#dc2626"}],
            )
        )

        if indicator:
            layers = [l for l in layers if l.indicator == indicator]
        return layers


forest_service = ForestService()

