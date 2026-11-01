import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.services.carbon_service import CarbonService
from app.schemas.carbon import CarbonEstimateRequest


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        username="tech_juan",
        display_name="Ing. Juan Pérez",
        role="TECHNICIAN",
        active=True,
    )


def test_carbon_service_with_area():
    """Unit Test: CarbonService calculates accurate biomass, carbon and CO2e from area."""
    req = CarbonEstimateRequest(
        species_id="pinus_hartwegii",
        area_ha=4.5,
        tree_density_ha=1100.0,
        mean_dbh_cm=16.0,
        mean_height_m=8.5,
        inventory_plots_count=4,
    )
    res = CarbonService.estimate_carbon(req)
    assert res.area_ha == 4.5
    assert res.total_trees_estimated == 4950
    assert res.biomass_kg_per_tree > 0
    assert res.total_dry_biomass_t > 0
    assert res.total_carbon_t > 0
    assert res.total_co2e_t > 0
    assert res.carbon_fraction == 0.47
    assert res.data_quality_level == "ALTA"
    assert res.allometric_equation_code == "EQ-MEX-PHAR-01"


def test_carbon_service_with_geometry():
    """Unit Test: CarbonService derives geodesic area from GeoJSON Polygon."""
    # Polygon ~ 4.8 ha in Valle de Toluca
    geom = {
        "type": "Polygon",
        "coordinates": [
            [
                [-99.7215, 19.2450],
                [-99.7180, 19.2450],
                [-99.7180, 19.2485],
                [-99.7215, 19.2485],
                [-99.7215, 19.2450],
            ]
        ],
    }
    req = CarbonEstimateRequest(
        species_id="abies_religiosa",
        geometry=geom,
        mean_dbh_cm=22.0,
        mean_height_m=12.0,
    )
    res = CarbonService.estimate_carbon(req)
    assert 10.0 < res.area_ha < 20.0
    assert res.species_scientific_name == "Abies religiosa"
    assert res.co2e_factor == 3.6667
    assert res.confidence_level == "90%"


def test_carbon_service_out_of_range_dbh_warning():
    """Edge Case: DBH outside species valid range must generate a scientific warning."""
    req = CarbonEstimateRequest(
        species_id="pinus_hartwegii",
        area_ha=2.0,
        mean_dbh_cm=140.0,  # Max valid is 95 cm
    )
    res = CarbonService.estimate_carbon(req)
    assert len(res.warnings) > 0
    assert any("fuera del intervalo validado" in w for w in res.warnings)


@pytest.mark.asyncio
async def test_get_carbon_equations_endpoint():
    """Happy Path: Catalog of allometric equations is publicly accessible."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/carbon/equations")
        assert res.status_code == 200
        equations = res.json()
        assert len(equations) >= 5
        species_ids = [eq["species_id"] for eq in equations]
        assert "pinus_hartwegii" in species_ids
        assert "abies_religiosa" in species_ids


@pytest.mark.asyncio
async def test_estimate_carbon_endpoint(mock_user):
    """Happy Path: Authenticated user requests a carbon estimate via API."""
    app.dependency_overrides[get_current_user] = lambda: mock_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "species_id": "pinus_montezumae",
                "area_ha": 3.2,
                "tree_density_ha": 1000,
                "mean_dbh_cm": 15.0,
                "mean_height_m": 8.0,
            }
            res = await client.post(
                "/api/v1/carbon/estimate",
                json=payload,
                headers={"Authorization": "Bearer test-token"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["species_scientific_name"] == "Pinus montezumae"
            assert data["total_co2e_t"] > 0
            assert data["methodology_version"] == "CARBON-1.0"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
