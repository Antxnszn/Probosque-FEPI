"""
Probosque Multitemporal Forest Viewer — Phase 2 Mass Ingestion Pipeline
Ingests authentic, official MapBiomas México Colección 1.0 land cover statistics
and Google Earth Engine raster products for all 125 municipalities of Estado de México
plus the State perimeter across the entire 2010–2025 time series.

Methodological Notes:
- Source: MapBiomas México Colección 1.0 (1985-2025)
- Spatial Method: Union over official INEGI Marco Geoestadístico 2023 boundaries
- Resolution: 30m Landsat
- License: CC BY 4.0
- Classes: 17 official Level-2 / Level-3 classes
- Idempotent upsert via PostgreSQL uq_region_year_class_version constraint
"""

import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import sessionmaker

# Setup path to backend
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.config import settings
from app.models.forest import DataSource, GeoRegion, ProcessingRun, RasterProduct, RegionYearStat

# Official 17 leaf classes of MapBiomas México Colección 1.0
LEAF_PIXELS = [88, 89, 3, 5, 66, 45, 11, 15, 36, 19, 9, 21, 24, 25, 33, 34, 27]
YEARS = list(range(2010, 2026))  # 2010 to 2025 (16 years)
PROCESSING_VERSION = "mapbiomas-col1-v1.0"
MAPBIOMAS_API_BASE = "https://prd.plataforma.mapbiomas.org/api/v1/mexico"
HEADERS = {"tenant-id": "mapbiomas", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def fetch_official_tile_url(year: int) -> Optional[str]:
    """
    Fetches the live Earth Engine XYZ tile URL template for a given year.
    """
    query = "&".join([f"pixelValue={v}" for v in LEAF_PIXELS])
    url = f"{MAPBIOMAS_API_BASE}/maps/map?subthemeKey=coverage_lclu&legendKey=default&year={year}&{query}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return data.get("url")
    except Exception as e:
        print(f"  [WARN] Failed to fetch tile URL for year {year}: {e}")
        return None


def fetch_all_edomex_territories() -> List[Dict]:
    """
    Fetches the catalog of all 125 municipalities of Estado de México from MapBiomas API.
    """
    territories = []
    for page in range(1, 14):
        url = f"{MAPBIOMAS_API_BASE}/territories?parentId=37-2-15&page={page}"
        req = urllib.request.Request(url, headers=HEADERS)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    data = json.loads(resp.read().decode())
                    items = data.get("territories", [])
                    territories.extend(items)
                    break
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"Error fetching territories page {page}: {e}")
                time.sleep(1.0)
        time.sleep(0.05)
    return territories


def query_area_statistics(territory_id: str, category_id: int, years: List[int]) -> Optional[List[Dict]]:
    """
    Queries annual surface statistics per class for the territory across the given years.
    """
    params = [
        ("subthemeKey", "coverage_lclu"),
        ("legendKey", "default"),
        ("spatialMethod", "union"),
        ("territoryCategoryId", str(category_id)),
        ("territoryId", territory_id),
    ]
    for y in years:
        params.append(("year", str(y)))
    for p in LEAF_PIXELS:
        params.append(("pixelValue", str(p)))

    query_str = urllib.parse.urlencode(params)
    url = f"{MAPBIOMAS_API_BASE}/statistics/area?{query_str}"
    req = urllib.request.Request(url, headers=HEADERS)

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode())
                return data.get("statistic", [])
        except urllib.error.HTTPError as he:
            if he.code == 404:
                return []
            if attempt == 2:
                print(f"  [ERROR] HTTP {he.code} for territory {territory_id}: {he}")
                return None
            time.sleep(1.5)
        except Exception as e:
            if attempt == 2:
                print(f"  [ERROR] Connection error for territory {territory_id}: {e}")
                return None
            time.sleep(1.5)
    return None


def run_mass_ingestion():
    print("=" * 80)
    print("PROBOSQUE FASE 2: INGESTIÓN MASIVA MULTITEMPORAL MAPBIOMAS MÉXICO COL. 1.0")
    print("Cobertura: 125 Municipios + Nivel Estatal (15) | Serie: 2010–2025 (16 años)")
    print("=" * 80)

    engine = create_engine(settings.SYNC_DATABASE_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()

    job_start = datetime.now(timezone.utc)
    run_log = ProcessingRun(
        job_name="ingest_mapbiomas_edomex_all_municipalities",
        region_id="15",
        parameters={
            "years": YEARS,
            "scope": "125_municipalities_plus_state",
            "source": "mapbiomas_mexico",
            "classes_count": len(LEAF_PIXELS),
        },
        status="RUNNING",
        started_at=job_start,
        output_version=PROCESSING_VERSION,
    )
    session.add(run_log)
    session.commit()

    try:
        # 1. Verify Data Source
        ds = session.query(DataSource).filter_by(key="mapbiomas_mexico").first()
        if not ds:
            raise RuntimeError("DataSource 'mapbiomas_mexico' not found. Run init_db_tables.py first.")

        # 2. Ingest Raster Products for 2010-2025
        print("\n--- PASO 1: Ingestión de Productos Raster (Tile URLs) para 2010–2025 ---")
        raster_count = 0
        for year in YEARS:
            tile_url = fetch_official_tile_url(year)
            status = "ready" if tile_url else "pending_ingest"

            # State-wide raster product
            stmt = insert(RasterProduct).values(
                source_id=ds.id,
                indicator="land_cover",
                year=year,
                region_scope="15",
                processing_version=PROCESSING_VERSION,
                tile_strategy="xyz",
                tile_url_template=tile_url,
                status=status,
                valid_pixel_fraction=1.0,
                extra_metadata={"legend": "default", "subtheme": "coverage_lclu"},
                produced_at=datetime.now(timezone.utc),
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_raster_product_unique",
                set_={
                    "tile_url_template": stmt.excluded.tile_url_template,
                    "status": stmt.excluded.status,
                    "produced_at": stmt.excluded.produced_at,
                },
            )
            session.execute(stmt)
            raster_count += 1
            print(f"  [Raster {year}] Estado: {status} | URL: {tile_url[:55] if tile_url else 'None'}...")
            time.sleep(0.04)

        session.commit()
        print(f"Raster products registrados: {raster_count}/16")

        # 3. Retrieve Municipalities Catalog from MapBiomas API
        print("\n--- PASO 2: Obteniendo catálogo de territorios de Estado de México ---")
        territories = fetch_all_edomex_territories()
        print(f"Catálogo obtenido: {len(territories)} municipios encontrados en MapBiomas México.")

        # Build list of targets: 125 municipalities + 1 state
        targets = []
        for t in territories:
            geocode = t.get("geocode")
            tid = t.get("id")
            name = t.get("name", "")
            targets.append({"geocode": geocode, "territory_id": tid, "category_id": 3, "name": name})

        # Add state level
        targets.append({"geocode": "15", "territory_id": "37-2-15", "category_id": 2, "name": "Estado de México"})

        # Check existing regions in DB
        existing_regions = {r.inegi_code for r in session.query(GeoRegion.inegi_code).all()}

        # 4. Ingest Statistics per Region
        print(f"\n--- PASO 3: Ingestión masiva de estadísticas anuales ({len(targets)} territorios) ---")
        total_records_inserted = 0
        total_regions_successful = 0
        failed_regions = []

        start_time = time.time()

        for idx, target in enumerate(targets, 1):
            geocode = target["geocode"]
            tid = target["territory_id"]
            cat_id = target["category_id"]
            name = target["name"]

            if geocode not in existing_regions:
                print(f"  [{idx}/{len(targets)}] AVISO: {geocode} ({name}) no existe en geo_regions, omitiendo.")
                continue

            stat_items = query_area_statistics(tid, cat_id, YEARS)
            if stat_items is None:
                failed_regions.append(geocode)
                print(f"  [{idx}/{len(targets)}] FALLO al consultar estadísticas para {geocode} ({name})")
                continue

            # Prepare records for batch insertion
            db_records = []
            for y_stat in stat_items:
                year_list = y_stat.get("year", [])
                year_val = year_list[0] if year_list else None
                if not year_val or year_val not in YEARS:
                    continue

                total_valid_ha = float(y_stat.get("total", 0.0))
                items = y_stat.get("items", [])

                for item in items:
                    pixel_val = item.get("pixelValue")
                    area_val = float(item.get("value", 0.0))

                    db_records.append({
                        "region_id": geocode,
                        "source_id": ds.id,
                        "year": year_val,
                        "class_code": pixel_val,
                        "area_ha": round(area_val, 4),
                        "valid_area_ha": round(total_valid_ha, 4),
                        "nodata_area_ha": 0.0,
                        "classified_area_ha": round(total_valid_ha, 4),
                        "boundary_version": "INEGI-MG-2023",
                        "collection_version": "1.0",
                        "processing_version": PROCESSING_VERSION,
                        "created_at": datetime.now(timezone.utc),
                    })

            if db_records:
                stmt = insert(RegionYearStat).values(db_records)
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_region_year_class_version",
                    set_={
                        "area_ha": stmt.excluded.area_ha,
                        "valid_area_ha": stmt.excluded.valid_area_ha,
                        "nodata_area_ha": stmt.excluded.nodata_area_ha,
                        "classified_area_ha": stmt.excluded.classified_area_ha,
                        "created_at": stmt.excluded.created_at,
                    },
                )
                session.execute(stmt)
                total_records_inserted += len(db_records)
                total_regions_successful += 1

            # Commit periodically every 5 regions
            if idx % 5 == 0 or idx == len(targets):
                session.commit()
                elapsed = time.time() - start_time
                avg_rate = idx / elapsed if elapsed > 0 else 0
                print(
                    f"  [{idx}/{len(targets)}] {geocode} ({name[:20]}): "
                    f"{len(stat_items)} años, {len(db_records)} registros. "
                    f"Progreso total: {total_records_inserted:,} registros ({avg_rate:.1f} reg/s)"
                )

            time.sleep(0.08)

        # 5. Finalize Processing Run
        duration_s = round(time.time() - start_time, 2)
        run_log.status = "COMPLETED" if not failed_regions else "PARTIALLY_COMPLETED"
        run_log.finished_at = datetime.now(timezone.utc)
        run_log.counts = {
            "raster_products": raster_count,
            "target_regions": len(targets),
            "successful_regions": total_regions_successful,
            "failed_regions_count": len(failed_regions),
            "failed_regions": failed_regions,
            "total_records_inserted": total_records_inserted,
            "duration_seconds": duration_s,
        }
        session.commit()

        print("\n" + "=" * 80)
        print("INGESTIÓN MASIVA MAPBIOMAS COMPLETADA CON ÉXITO")
        print(f"- Regiones procesadas: {total_regions_successful}/{len(targets)}")
        print(f"- Registros estadísticos anuales insertados/actualizados: {total_records_inserted:,}")
        print(f"- Productos raster registrados: {raster_count} (2010–2025)")
        print(f"- Duración total: {duration_s} segundos")
        if failed_regions:
            print(f"- AVISO: Regiones con fallos: {failed_regions}")
        print("=" * 80)

    except Exception as e:
        session.rollback()
        run_log.status = "FAILED"
        run_log.finished_at = datetime.now(timezone.utc)
        run_log.error_detail = str(e)
        session.commit()
        print(f"\n[FATAL] Error en ingestión masiva: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    run_mass_ingestion()
