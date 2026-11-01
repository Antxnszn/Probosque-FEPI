"""
Database initialization and seed script for Probosque Forest Viewer.
Creates tables and populates:
1. DataSource (MapBiomas México Colección 1.0)
2. LandCoverClass (17 official classes with probosque-v1.0 policy)
3. GeoRegion (125 municipalities + State from INEGI Marco Geoestadístico 2023)
"""

import json
import pathlib
import sys
import yaml
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup paths
base_dir = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(base_dir / "backend"))

from app.config import settings
from app.database import Base
from app.models.forest import GeoRegion, DataSource, LandCoverClass, RasterProduct, RegionYearStat, ProcessingRun


def init_database():
    print(f"Connecting to database: {settings.SYNC_DATABASE_URL}")
    engine = create_engine(settings.SYNC_DATABASE_URL)
    
    # Create forest tables specifically
    forest_tables = [
        GeoRegion.__table__,
        DataSource.__table__,
        LandCoverClass.__table__,
        RasterProduct.__table__,
        RegionYearStat.__table__,
        ProcessingRun.__table__,
    ]
    for table in forest_tables:
        table.create(bind=engine, checkfirst=True)
    print("Forest database tables created successfully.")
    
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Seed DataSource: MapBiomas México
        sources_path = base_dir / "pipelines" / "configs" / "data_sources.yaml"
        sources_cfg = yaml.safe_load(sources_path.read_text(encoding="utf-8"))["sources"]["mapbiomas_mexico"]

        ds = session.query(DataSource).filter_by(key="mapbiomas_mexico").first()
        if not ds:
            ds = DataSource(
                key="mapbiomas_mexico",
                provider=sources_cfg["provider"],
                product=sources_cfg["product"],
                collection_version=sources_cfg["collection_version"],
                asset_id=sources_cfg["asset_id"],
                first_year=sources_cfg["first_year"],
                last_year=sources_cfg["last_year"],
                resolution_m=sources_cfg["resolution_m"],
                license=sources_cfg["license"],
                citation=sources_cfg["citation"],
                methodology_url=sources_cfg["methodology_url"],
                ingest_status="ready",
            )
            session.add(ds)
            session.flush()
            print("Seeded DataSource: MapBiomas México Colección 1.0")
        else:
            ds.asset_id = sources_cfg["asset_id"]
            ds.license = sources_cfg["license"]
            ds.citation = sources_cfg["citation"]
            session.flush()
            print("Updated DataSource: MapBiomas México Colección 1.0")

        # 2. Seed LandCoverClasses
        classes_path = base_dir / "pipelines" / "configs" / "edomex_forest_classes.yaml"
        classes_cfg = yaml.safe_load(classes_path.read_text(encoding="utf-8"))
        grouping_version = classes_cfg.get("forest_grouping_version", "probosque-v1.0")

        classes_created = 0
        for item in classes_cfg["classes"]:
            existing_class = (
                session.query(LandCoverClass)
                .filter_by(
                    source_id=ds.id,
                    class_code=item["code"],
                    forest_grouping_version=grouping_version,
                )
                .first()
            )
            if not existing_class:
                lc = LandCoverClass(
                    source_id=ds.id,
                    class_code=item["code"],
                    name_es=item["name_es"],
                    name_en=item["name_en"],
                    hex_color=item["hex_color"],
                    level=item.get("level", 2),
                    forest_grouping_version=grouping_version,
                    is_forest=item["is_forest"],
                    is_native_forest=item.get("is_native_forest", False),
                    is_forest_approved=item.get("is_forest_approved", False),
                    description=item.get("description"),
                )
                session.add(lc)
                classes_created += 1

        print(f"Seeded {classes_created} LandCoverClasses for {grouping_version}.")

        # 3. Seed GeoRegions (125 Municipalities + State)
        catalog_path = base_dir / "data" / "inegi" / "edomex_municipios_catalog.json"
        catalog_data = json.loads(catalog_path.read_text(encoding="utf-8"))

        # Add state region
        state_path = base_dir / "data" / "inegi" / "edomex_state_simplified.geojson"
        if not state_path.exists():
            state_path = base_dir / "data" / "inegi" / "edomex_state.geojson"
        state_data = json.loads(state_path.read_text(encoding="utf-8"))
        state_props = state_data["features"][0]["properties"]
        state_geom = state_data["features"][0]["geometry"]

        existing_state = session.query(GeoRegion).filter_by(inegi_code="15").first()
        if not existing_state:
            state_reg = GeoRegion(
                inegi_code="15",
                cve_mun="000",
                name="Estado de México",
                type="state",
                parent_code="MEX",
                boundary_version="INEGI-MG-2023",
                area_ha_official=state_props.get("area_ha", 2235175.16),
                bbox=state_props.get("bbox", [-100.6131, 18.3669, -98.5969, 20.2859]),
                center=[19.35, -99.65],
                geom_geojson=state_geom,
            )
            session.add(state_reg)
            print("Seeded State GeoRegion: Estado de México (15)")

        # Load municipal features
        mun_geojson_path = base_dir / "data" / "inegi" / "edomex_125_municipios_simplified.geojson"
        if not mun_geojson_path.exists():
            mun_geojson_path = base_dir / "data" / "inegi" / "edomex_125_municipios.geojson"
        mun_geojson_data = json.loads(mun_geojson_path.read_text(encoding="utf-8"))
        mun_features = {f["properties"]["inegi_code"]: f["geometry"] for f in mun_geojson_data["features"]}

        mun_count = 0
        for item in catalog_data:
            cve = item["inegi_code"]
            existing = session.query(GeoRegion).filter_by(inegi_code=cve).first()
            if not existing:
                geom = mun_features.get(cve)
                reg = GeoRegion(
                    inegi_code=cve,
                    cve_mun=item["cve_mun"],
                    name=item["name"],
                    type="municipality",
                    parent_code="15",
                    boundary_version="INEGI-MG-2023",
                    area_ha_official=item["area_ha"],
                    bbox=item["bbox"],
                    center=item["center"],
                    geom_geojson=geom,
                )
                session.add(reg)
                mun_count += 1

        print(f"Seeded {mun_count} municipal GeoRegions.")

        session.commit()
        print("Initialization completed successfully!")
    except Exception as e:
        session.rollback()
        print("Error during initialization:", e)
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    init_database()
