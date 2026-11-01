"""
Load, reproject, and validate official INEGI Marco Geoestadístico 2023 boundaries
for the State of Mexico (Entidad 15) and its 125 municipalities.
Outputs canonical GeoJSON files and catalog in EPSG:4326 (WGS84).
"""

import json
import pathlib
import shapefile
import pyproj
import shapely.geometry
import shapely.ops


def process_inegi_boundaries():
    base_dir = pathlib.Path(__file__).resolve().parent.parent.parent
    extracted_dir = base_dir / "data" / "inegi" / "extracted"
    out_dir = base_dir / "data" / "inegi"
    out_dir.mkdir(parents=True, exist_ok=True)

    mun_shp = extracted_dir / "15mun.shp"
    ent_shp = extracted_dir / "15ent.shp"

    if not mun_shp.exists() or not ent_shp.exists():
        raise FileNotFoundError(f"Missing INEGI shapefiles in {extracted_dir}. Ensure 15_mexico.zip has been extracted.")

    # INEGI LCC (EPSG:6372) to WGS84 (EPSG:4326)
    transformer = pyproj.Transformer.from_crs("EPSG:6372", "EPSG:4326", always_xy=True)
    geod = pyproj.Geod(ellps="WGS84")

    # 1. Process 125 Municipalities
    print("Processing 125 municipalities from 15mun.shp...")
    sf_mun = shapefile.Reader(str(mun_shp), encoding="iso-8859-1")
    
    municipalities_features = []
    catalog_list = []

    for shape_rec in sf_mun.shapeRecords():
        props = shape_rec.record.as_dict()
        cvegeo = str(props.get("CVEGEO", "")).strip()
        cve_mun = str(props.get("CVE_MUN", "")).strip()
        name = str(props.get("NOMGEO", "")).strip()

        # Transform geometry
        geom_orig = shapely.geometry.shape(shape_rec.shape.__geo_interface__)
        geom_wgs84 = shapely.ops.transform(transformer.transform, geom_orig)

        if not geom_wgs84.is_valid:
            geom_wgs84 = shapely.make_valid(geom_wgs84)

        # Ensure MultiPolygon representation
        if geom_wgs84.geom_type == "Polygon":
            geom_wgs84 = shapely.geometry.MultiPolygon([geom_wgs84])

        area_m2, _ = geod.geometry_area_perimeter(geom_wgs84)
        area_ha = round(abs(area_m2) / 10000.0, 4)

        bounds = [round(b, 5) for b in geom_wgs84.bounds]
        centroid = geom_wgs84.centroid
        center = [round(centroid.y, 5), round(centroid.x, 5)]

        feature = {
            "type": "Feature",
            "id": cvegeo,
            "properties": {
                "inegi_code": cvegeo,
                "cve_mun": cve_mun,
                "name": name,
                "area_ha": area_ha,
                "bbox": bounds,
                "center": center,
            },
            "geometry": shapely.geometry.mapping(geom_wgs84),
        }
        municipalities_features.append(feature)

        catalog_list.append({
            "inegi_code": cvegeo,
            "cve_mun": cve_mun,
            "name": name,
            "area_ha": area_ha,
            "bbox": bounds,
            "center": center,
        })

    # Sort deterministically by inegi_code
    municipalities_features.sort(key=lambda f: f["properties"]["inegi_code"])
    catalog_list.sort(key=lambda m: m["inegi_code"])

    if len(municipalities_features) != 125:
        raise ValueError(f"Expected exactly 125 municipalities, found {len(municipalities_features)}")

    mun_geojson = {
        "type": "FeatureCollection",
        "name": "edomex_125_municipios",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "metadata": {
            "source": "INEGI Marco Geoestadístico Integrado",
            "version": "Diciembre 2023",
            "state_code": "15",
            "municipalities_count": len(municipalities_features),
        },
        "features": municipalities_features,
    }

    mun_out_path = out_dir / "edomex_125_municipios.geojson"
    mun_out_path.write_text(json.dumps(mun_geojson, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {mun_out_path} ({mun_out_path.stat().st_size / 1024 / 1024:.2f} MB)")

    cat_out_path = out_dir / "edomex_municipios_catalog.json"
    cat_out_path.write_text(json.dumps(catalog_list, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {cat_out_path} ({len(catalog_list)} municipalities)")

    # 2. Process State Boundary
    print("Processing state perimeter from 15ent.shp...")
    sf_ent = shapefile.Reader(str(ent_shp), encoding="iso-8859-1")
    ent_record = sf_ent.shapeRecord(0)
    ent_orig = shapely.geometry.shape(ent_record.shape.__geo_interface__)
    ent_wgs84 = shapely.ops.transform(transformer.transform, ent_orig)

    if not ent_wgs84.is_valid:
        ent_wgs84 = shapely.make_valid(ent_wgs84)

    if ent_wgs84.geom_type == "Polygon":
        ent_wgs84 = shapely.geometry.MultiPolygon([ent_wgs84])

    state_area_m2, _ = geod.geometry_area_perimeter(ent_wgs84)
    state_area_ha = round(abs(state_area_m2) / 10000.0, 4)
    state_bounds = [round(b, 5) for b in ent_wgs84.bounds]

    state_geojson = {
        "type": "FeatureCollection",
        "name": "edomex_state_boundary",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "metadata": {
            "source": "INEGI Marco Geoestadístico Integrado",
            "version": "Diciembre 2023",
            "state_code": "15",
            "state_name": "Estado de México",
            "area_ha": state_area_ha,
            "bbox": state_bounds,
        },
        "features": [
            {
                "type": "Feature",
                "id": "15",
                "properties": {
                    "inegi_code": "15",
                    "name": "Estado de México",
                    "area_ha": state_area_ha,
                    "bbox": state_bounds,
                },
                "geometry": shapely.geometry.mapping(ent_wgs84),
            }
        ],
    }

    state_out_path = out_dir / "edomex_state.geojson"
    state_out_path.write_text(json.dumps(state_geojson, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {state_out_path} ({state_out_path.stat().st_size / 1024:.1f} KB)")
    print("All INEGI geometries processed and validated successfully.")


if __name__ == "__main__":
    process_inegi_boundaries()
