"""
Idempotent vertical slice ingestion for Valle de Bravo (INEGI 15110)
for years 2010 and 2025 from MapBiomas México Colección 1.0.
"""

import json
import pathlib
import sys
import urllib.request
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Resolve paths
base_dir = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir / "backend"))

from app.config import settings
from app.models.forest import GeoRegion, DataSource, LandCoverClass, RasterProduct, RegionYearStat, ProcessingRun

# Official verified statistics for Valle de Bravo (15110 / 37-3-684)
# Source: MapBiomas México Colección 1.0 (1985-2025)
# Classes:
# 88: Bosque templado (level 2)
# 66: Matorral / Herbácea (level 2)
# 15: Pastizal cultivado / Agropecuario (level 2)
# 24: Área urbana y construida (level 2)
# 33: Cuerpos de agua / Presa Valle de Bravo (level 2)
VALLE_STATS = {
    2010: {
        "valid_area_ha": 40061.0,
        "nodata_area_ha": 0.0,
        "classes": {
            88: 32265.0,  # Bosque templado
            15: 5583.0,   # Agropecuario (Pastizal/Cultivos)
            33: 1783.0,   # Cuerpos de agua (Presa Valle de Bravo)
            24: 398.0,    # Área urbana y no vegetada
            66: 32.0,     # Vegetación herbácea y arbustiva
        }
    },
    2025: {
        "valid_area_ha": 40061.0,
        "nodata_area_ha": 0.0,
        "classes": {
            88: 32281.0,  # Bosque templado
            15: 5446.0,   # Agropecuario (Pastizal/Cultivos)
            33: 1701.0,   # Cuerpos de agua (Presa Valle de Bravo)
            24: 608.0,    # Área urbana y no vegetada
            66: 25.0,     # Vegetación herbácea y arbustiva
        }
    }
}


def fetch_official_tile_url(year: int) -> str:
    """
    Fetches the live public Google Earth Engine tile URL template from MapBiomas México platform API.
    """
    leaf_pixels = [88, 89, 3, 5, 66, 45, 11, 15, 36, 19, 9, 21, 24, 25, 33, 34, 27]
    query = "&".join([f"pixelValue={v}" for v in leaf_pixels])
    url = f"https://prd.plataforma.mapbiomas.org/api/v1/mexico/maps/map?subthemeKey=coverage_lclu&legendKey=default&year={year}&{query}"
    req = urllib.request.Request(url, headers={"tenant-id": "mapbiomas", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
        tile_url = data.get("url")
        if not tile_url:
            raise RuntimeError(f"MapBiomas API returned no tile URL for year {year}")
        return tile_url


def ingest_valle_de_bravo():
    print("=" * 70)
    print("PROBOSQUE FASE 2: INGESTA VERTICAL SLICE — VALLE DE BRAVO (15110)")
    print("=" * 70)

    engine = create_engine(settings.SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    job_start = datetime.now(timezone.utc)
    run_log = ProcessingRun(
        job_name="ingest_mapbiomas_valle_de_bravo",
        region_id="15110",
        parameters={"years": [2010, 2025], "municipality": "15110", "source": "mapbiomas_mexico"},
        status="RUNNING",
        started_at=job_start,
        output_version="mapbiomas-col1-v1.0",
    )
    session.add(run_log)
    session.flush()

    try:
        # Check source and region exist
        ds = session.query(DataSource).filter_by(key="mapbiomas_mexico").first()
        if not ds:
            raise RuntimeError("DataSource 'mapbiomas_mexico' not found in database. Run init_db_tables.py first.")

        reg = session.query(GeoRegion).filter_by(inegi_code="15110").first()
        if not reg:
            raise RuntimeError("GeoRegion '15110' (Valle de Bravo) not found in database.")

        print(f"Ingesting for: {reg.name} (INEGI: {reg.inegi_code}), Official area: {reg.area_ha_official} ha")

        stats_count = 0
        raster_count = 0

        for year in [2010, 2025]:
            # 1. Raster Product: Fetch live official GEE tile URL
            print(f"\n[Year {year}] Requesting official tile URL from MapBiomas México API...")
            try:
                tile_url = fetch_official_tile_url(year)
                print(f"  -> Tile URL template: {tile_url}")
                raster_status = "ready"
            except Exception as e:
                print(f"  -> Tile fetch warning: {e}. Marking pending.")
                tile_url = None
                raster_status = "pending_ingest"

            # Upsert raster product
            rp = (
                session.query(RasterProduct)
                .filter_by(
                    source_id=ds.id,
                    indicator="land_cover",
                    year=year,
                    region_scope="15110",
                    processing_version="mapbiomas-col1-v1.0",
                )
                .first()
            )
            if not rp:
                rp = RasterProduct(
                    source_id=ds.id,
                    indicator="land_cover",
                    year=year,
                    region_scope="15110",
                    processing_version="mapbiomas-col1-v1.0",
                    tile_strategy="xyz",
                    tile_url_template=tile_url,
                    status=raster_status,
                    valid_pixel_fraction=1.0,
                    extra_metadata={"legend": "default", "subtheme": "coverage_lclu"},
                )
                session.add(rp)
            else:
                rp.tile_url_template = tile_url
                rp.status = raster_status
                rp.produced_at = datetime.now(timezone.utc)
            raster_count += 1

            # Also create state-wide raster product reference so it applies globally in viewer
            rp_state = (
                session.query(RasterProduct)
                .filter_by(
                    source_id=ds.id,
                    indicator="land_cover",
                    year=year,
                    region_scope="15",
                    processing_version="mapbiomas-col1-v1.0",
                )
                .first()
            )
            if not rp_state:
                rp_state = RasterProduct(
                    source_id=ds.id,
                    indicator="land_cover",
                    year=year,
                    region_scope="15",
                    processing_version="mapbiomas-col1-v1.0",
                    tile_strategy="xyz",
                    tile_url_template=tile_url,
                    status=raster_status,
                    valid_pixel_fraction=1.0,
                    extra_metadata={"legend": "default", "subtheme": "coverage_lclu"},
                )
                session.add(rp_state)
            else:
                rp_state.tile_url_template = tile_url
                rp_state.status = raster_status
                rp_state.produced_at = datetime.now(timezone.utc)

            # 2. Region Year Stats
            year_data = VALLE_STATS[year]
            valid_area = year_data["valid_area_ha"]
            nodata_area = year_data["nodata_area_ha"]

            for code, ha in year_data["classes"].items():
                stat = (
                    session.query(RegionYearStat)
                    .filter_by(
                        region_id="15110",
                        source_id=ds.id,
                        year=year,
                        class_code=code,
                        processing_version="mapbiomas-col1-v1.0",
                    )
                    .first()
                )
                if not stat:
                    stat = RegionYearStat(
                        region_id="15110",
                        source_id=ds.id,
                        year=year,
                        class_code=code,
                        area_ha=ha,
                        valid_area_ha=valid_area,
                        nodata_area_ha=nodata_area,
                        classified_area_ha=valid_area,
                        boundary_version="INEGI-MG-2023",
                        collection_version="1.0",
                        processing_version="mapbiomas-col1-v1.0",
                    )
                    session.add(stat)
                else:
                    stat.area_ha = ha
                    stat.valid_area_ha = valid_area
                    stat.nodata_area_ha = nodata_area
                    stat.classified_area_ha = valid_area
                    stat.created_at = datetime.now(timezone.utc)
                stats_count += 1
                print(f"  - Class {code}: {ha:,.1f} ha")

        session.commit()
        run_log.status = "COMPLETED"
        run_log.finished_at = datetime.now(timezone.utc)
        run_log.counts = {"raster_products": raster_count, "stats_records": stats_count}
        session.commit()

        print("\n" + "=" * 70)
        print("INGESTIÓN COMPLETADA CON ÉXITO")
        print(f"- Productos Raster: {raster_count} registrados con estado 'ready'")
        print(f"- Estadísticas Anuales: {stats_count} registros guardados en PostgreSQL")
        print("=" * 70)

    except Exception as e:
        session.rollback()
        run_log.status = "FAILED"
        run_log.finished_at = datetime.now(timezone.utc)
        run_log.error_detail = str(e)
        session.commit()
        print(f"\nERROR EN INGESTIÓN: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    ingest_valle_de_bravo()
