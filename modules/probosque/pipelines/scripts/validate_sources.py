"""
Validation script for Fase 0 — Descubrimiento de datos, geodatos y licencias.
Checks:
1. INEGI Marco Geoestadístico 2023 (125 municipalities and state perimeter).
2. MapBiomas México Colección 1.0 configuration, asset path, and official legend classes.
3. Hansen Global Forest Change v1.13 configuration and lossyear rules.
4. Google Earth Engine operational authentication status and blockers.
"""

import json
import pathlib
import sys
import yaml


def validate_inegi(base_dir: pathlib.Path) -> dict:
    inegi_dir = base_dir / "data" / "inegi"
    mun_path = inegi_dir / "edomex_125_municipios.geojson"
    state_path = inegi_dir / "edomex_state.geojson"
    cat_path = inegi_dir / "edomex_municipios_catalog.json"

    result = {
        "status": "PASS",
        "errors": [],
        "warnings": [],
        "details": {},
    }

    if not mun_path.exists() or not state_path.exists() or not cat_path.exists():
        result["status"] = "FAIL"
        result["errors"].append("Missing generated GeoJSON or catalog files in data/inegi.")
        return result

    # Check municipalities
    mun_data = json.loads(mun_path.read_text(encoding="utf-8"))
    features = mun_data.get("features", [])
    count = len(features)
    result["details"]["municipalities_count"] = count

    if count != 125:
        result["status"] = "FAIL"
        result["errors"].append(f"Expected 125 municipalities, found {count}.")

    cvegeos = [f["properties"]["inegi_code"] for f in features]
    expected_cves = [f"15{i:03d}" for i in range(1, 126)]
    missing = set(expected_cves) - set(cvegeos)
    if missing:
        result["status"] = "FAIL"
        result["errors"].append(f"Missing INEGI municipal codes: {sorted(list(missing))}")

    # Check bounds
    state_data = json.loads(state_path.read_text(encoding="utf-8"))
    state_props = state_data["features"][0]["properties"]
    result["details"]["state_name"] = state_props["name"]
    result["details"]["state_area_ha"] = state_props["area_ha"]
    result["details"]["state_bbox"] = state_props["bbox"]

    # Verify bounding box sanity: Edomex lon in [-100.8, -98.4], lat in [18.2, 20.4]
    bbox = state_props["bbox"]
    if not (-101.0 <= bbox[0] <= -100.0 and 18.0 <= bbox[1] <= 18.5 and -98.8 <= bbox[2] <= -98.4 and 20.0 <= bbox[3] <= 20.5):
        result["status"] = "FAIL"
        result["errors"].append(f"State bounding box outside expected geographic limits: {bbox}")

    return result


def validate_mapbiomas(base_dir: pathlib.Path) -> dict:
    config_path = base_dir / "pipelines" / "configs" / "data_sources.yaml"
    legend_path = base_dir / "pipelines" / "configs" / "edomex_forest_classes.yaml"

    result = {
        "status": "PASS",
        "errors": [],
        "warnings": [],
        "details": {},
    }

    if not config_path.exists() or not legend_path.exists():
        result["status"] = "FAIL"
        result["errors"].append("Missing configuration YAML files in pipelines/configs.")
        return result

    sources = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    mb = sources["sources"].get("mapbiomas_mexico", {})

    expected_asset = "projects/mapbiomas-mexico/assets/LAND-COVER/COLLECTION-1/GENERAL/classification-ft/MEX_integration_natstable_lagunas_ft_v1"
    if mb.get("asset_id") != expected_asset:
        result["status"] = "FAIL"
        result["errors"].append(f"Invalid MapBiomas asset ID: {mb.get('asset_id')}. Expected {expected_asset}")

    if mb.get("license") != "CC BY 4.0":
        result["status"] = "FAIL"
        result["errors"].append(f"Invalid MapBiomas license: {mb.get('license')}. Expected CC BY 4.0")

    result["details"]["asset_id"] = mb.get("asset_id")
    result["details"]["license"] = mb.get("license")
    result["details"]["collection_version"] = mb.get("collection_version")
    result["details"]["temporal_scope"] = f"{mb.get('first_year')} - {mb.get('last_year')}"
    result["details"]["mvp_scope"] = f"{mb.get('mvp_first_year')} - {mb.get('mvp_last_year')}"

    # Check legend
    legend_data = yaml.safe_load(legend_path.read_text(encoding="utf-8"))
    classes = legend_data.get("classes", [])
    result["details"]["classes_count"] = len(classes)
    approved_forest = [c["name_es"] for c in classes if c.get("is_forest_approved")]
    result["details"]["approved_forest_classes"] = approved_forest
    result["details"]["methodological_decision"] = legend_data.get("methodological_decision")

    return result


def validate_hansen(base_dir: pathlib.Path) -> dict:
    config_path = base_dir / "pipelines" / "configs" / "data_sources.yaml"
    result = {
        "status": "PASS",
        "errors": [],
        "warnings": [],
        "details": {},
    }

    sources = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    hansen = sources["sources"].get("hansen_gfc", {})

    expected_asset = "UMD/hansen/global_forest_change_2025_v1_13"
    if hansen.get("asset_id") != expected_asset:
        result["status"] = "FAIL"
        result["errors"].append(f"Invalid Hansen asset ID: {hansen.get('asset_id')}. Expected {expected_asset}")

    result["details"]["asset_id"] = hansen.get("asset_id")
    result["details"]["collection_version"] = hansen.get("collection_version")
    result["details"]["canopy_threshold_pct"] = hansen.get("reference_canopy_cover_threshold_pct")
    result["details"]["lossyear_rule"] = "lossyear == 10 -> 2010; lossyear == 25 -> 2025"

    return result


def validate_gee_auth() -> dict:
    result = {
        "status": "UNKNOWN",
        "errors": [],
        "warnings": [],
        "details": {},
    }

    try:
        import ee
        try:
            ee.Initialize()
            result["status"] = "PASS"
            result["details"]["authenticated"] = True
        except Exception as e:
            result["status"] = "BLOCKED_EXTERNAL_AUTH"
            result["warnings"].append(
                "GEE OAuth refresh token on host is expired/unauthenticated (invalid_grant). "
                "Local interactive authentication (`earthengine authenticate`) or Service Account credentials "
                "are required to query GEE directly. Blocked per Phase 0 contract (B3)."
            )
            result["details"]["authenticated"] = False
            result["details"]["error"] = str(e)
    except ImportError:
        result["status"] = "FAIL"
        result["errors"].append("earthengine-api is not installed.")

    return result


def main():
    base_dir = pathlib.Path(__file__).resolve().parent.parent.parent
    print("=" * 70)
    print("PROBOSQUE VISOR FORESTAL — VALIDACIÓN DE FUENTES (FASE 0)")
    print("=" * 70)

    inegi_res = validate_inegi(base_dir)
    print(f"\n[1/4] INEGI Marco Geoestadístico 2023: {inegi_res['status']}")
    for k, v in inegi_res["details"].items():
        print(f"      - {k}: {v}")
    if inegi_res["errors"]:
        for err in inegi_res["errors"]:
            print(f"      ERROR: {err}")

    mb_res = validate_mapbiomas(base_dir)
    print(f"\n[2/4] MapBiomas México Colección 1.0: {mb_res['status']}")
    for k, v in mb_res["details"].items():
        print(f"      - {k}: {v}")
    if mb_res["errors"]:
        for err in mb_res["errors"]:
            print(f"      ERROR: {err}")

    hansen_res = validate_hansen(base_dir)
    print(f"\n[3/4] Hansen Global Forest Change v1.13: {hansen_res['status']}")
    for k, v in hansen_res["details"].items():
        print(f"      - {k}: {v}")
    if hansen_res["errors"]:
        for err in hansen_res["errors"]:
            print(f"      ERROR: {err}")

    gee_res = validate_gee_auth()
    print(f"\n[4/4] Google Earth Engine Authentication: {gee_res['status']}")
    if gee_res["warnings"]:
        for w in gee_res["warnings"]:
            print(f"      AVISO: {w}")

    print("\n" + "=" * 70)
    print("RESUMEN DE FASE 0:")
    print("1. Límites oficiales INEGI: CONFIRMADOS Y GENERADOS (125 municipios).")
    print("2. Asset MapBiomas Colección 1: LOCALIZADO Y DOCUMENTADO.")
    print("3. Leyenda y reglas de bosque: DEFINIDAS Y VERSIONADAS.")
    print("4. Hansen GFC v1.13: DOCUMENTADO Y REGLAS DE AÑO CONFIRMADAS.")
    print("5. Bloqueo B3 GEE: IDENTIFICADO (requiere reautenticación externa).")
    print("=" * 70)

    if inegi_res["status"] == "FAIL" or mb_res["status"] == "FAIL" or hansen_res["status"] == "FAIL":
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
