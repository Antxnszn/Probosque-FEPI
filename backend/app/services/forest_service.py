import json
import pathlib
import yaml
from typing import List, Dict, Any, Optional

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
        # Resolve project root
        self.base_dir = pathlib.Path(__file__).resolve().parent.parent.parent.parent
        self.config_dir = self.base_dir / "pipelines" / "configs"
        self.data_dir = self.base_dir / "data" / "inegi"

        self._metadata_cache: Optional[ForestMetadataResponse] = None
        self._catalog_cache: Optional[List[RegionSummary]] = None
        self._feature_map: Dict[str, Dict[str, Any]] = {}
        self._state_data: Optional[Dict[str, Any]] = None

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

    def get_annual_stats(self, region_id: str, year_from: int = 2010, year_to: int = 2025) -> AnnualStatsResponse:
        self._load_configs()
        region_detail = self.get_region_detail(region_id)
        name = region_detail.name if region_detail else region_id

        # Phase 0 & 1 empty state (no synthetic numbers, fully honest status)
        classes = [
            AnnualClassStat(
                code=c.code,
                name_es=c.name_es,
                hex_color=c.hex_color,
                area_ha=None,
                is_forest_approved=c.is_forest_approved,
            )
            for c in self._metadata_cache.legend_classes
        ]

        series = [
            AnnualStatsSeries(
                year=y,
                total_forest_approved_ha=None,
                classes=classes,
            )
            for y in range(max(2010, year_from), min(2025, year_to) + 1)
        ]

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
            data_status="pending_ingest",
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

    def get_layers(self, indicator: Optional[str] = None, year: Optional[int] = None) -> List[LayerSpec]:
        self._load_configs()
        layers = []
        target_year = year or 2025

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
                tile_strategy="xyz",
                tile_url_template=None,
                status="pending_ingest",
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
