import pytest
from carbon.calculator import calculate_from_gedi_l4a, calculate_from_allometric_equation
from sentinel.triage import evaluate_satellite_triage


def test_gedi_l4a_calculation():
    # 5.0 hectares with 62.4 Mg/ha AGBD, carbon fraction 0.47
    result = calculate_from_gedi_l4a(
        mean_agbd_mg_ha=62.4,
        area_ha=5.0,
        agbd_pi_lower_mg_ha=48.0,
        agbd_pi_upper_mg_ha=79.6,
        carbon_fraction=0.47,
    )
    assert result.method == "GEDI_L4A"
    assert result.total_dry_biomass_t == 312.0
    # Carbon: 312 * 0.47 = 146.64
    assert result.carbon_t == pytest.approx(146.64, abs=0.01)
    # CO2e: 146.64 * (44.01 / 12.01) = 537.38
    assert result.co2e_t == pytest.approx(537.38, abs=0.1)
    assert result.lower_t is not None
    assert result.upper_t is not None
    assert result.lower_t < result.co2e_t < result.upper_t


def test_allometric_equation_calculation():
    # Example equation: 0.0509 * (h ** 2.5124)
    # With h=18.45m -> 0.0509 * (18.45 ** 2.5124) ~= 77.2 kg/tree
    # At 800 trees/ha: (77.2 * 800) / 1000 ~= 61.76 t/ha
    result = calculate_from_allometric_equation(
        equation_expression="0.0509 * pow(h, 2.5124)",
        species="Pinus hartwegii",
        tree_density_ha=800,
        area_ha=2.5,
        variables={"h": 18.45},
        min_height_m=2.0,
        max_height_m=35.0,
        carbon_fraction=0.50,
    )
    assert result.method == "FIELD_ALLOMETRY"
    assert result.dry_biomass_t_ha == pytest.approx(61.76, abs=0.5)
    assert result.total_dry_biomass_t == pytest.approx(61.76 * 2.5, abs=1.0)


def test_allometric_out_of_bounds_fails_closed():
    with pytest.raises(ValueError, match="exceeds calibration maximum"):
        calculate_from_allometric_equation(
            equation_expression="0.0509 * pow(h, 2.5124)",
            species="Pinus hartwegii",
            tree_density_ha=800,
            area_ha=2.5,
            variables={"h": 45.0},  # Exceeds max 35.0m
            max_height_m=35.0,
        )


def test_satellite_triage_normal():
    res = evaluate_satellite_triage(
        baseline_ndvi=0.65,
        current_ndvi=0.62,  # delta = -0.03
        valid_pixel_fraction=0.88,
        observation_count=6,
    )
    assert res.status == "NORMAL"
    assert res.ndvi_delta == -0.03
    assert len(res.reason_codes) == 0


def test_satellite_triage_anomaly():
    res = evaluate_satellite_triage(
        baseline_ndvi=0.70,
        current_ndvi=0.45,  # delta = -0.25 (severe drop)
        valid_pixel_fraction=0.85,
        observation_count=5,
    )
    assert res.status == "ANOMALY"
    assert "PERSISTENT_NDVI_DECLINE" in res.reason_codes


def test_satellite_triage_inconclusive_cloud_cover():
    res = evaluate_satellite_triage(
        baseline_ndvi=0.70,
        current_ndvi=0.45,
        valid_pixel_fraction=0.40,  # Below 0.70 threshold
        observation_count=2,        # Below 3 threshold
    )
    assert res.status == "INCONCLUSIVE"
    assert "INSUFFICIENT_VALID_PIXELS" in res.reason_codes
    assert "INSUFFICIENT_OBSERVATION_COUNT" in res.reason_codes
