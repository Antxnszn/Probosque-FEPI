import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_get_forest_metadata():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/forest/metadata")
        assert res.status_code == 200
        data = res.json()
        assert data["state_code"] == "15"
        assert data["municipalities_count"] == 125
        assert 2010 in data["years_available"]
        assert 2025 in data["years_available"]
        assert "mapbiomas_mexico" in data["sources"]
        assert "hansen_gfc" in data["sources"]
        assert len(data["legend_classes"]) >= 15
        temperate_forest = next((c for c in data["legend_classes"] if c["code"] == 88), None)
        assert temperate_forest is not None
        assert temperate_forest["is_forest_approved"] is True


@pytest.mark.asyncio
async def test_list_municipalities():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/forest/regions")
        assert res.status_code == 200
        regions = res.json()
        assert len(regions) == 125
        assert regions[0]["inegi_code"] == "15001"
        assert regions[-1]["inegi_code"] == "15125"
        for r in regions:
            assert len(r["bbox"]) == 4
            assert len(r["center"]) == 2
            assert r["area_ha"] > 0


@pytest.mark.asyncio
async def test_get_region_detail_municipality_and_state():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Valle de Bravo (15110)
        res_valle = await ac.get("/api/v1/forest/regions/15110")
        assert res_valle.status_code == 200
        valle = res_valle.json()
        assert valle["name"] == "Valle de Bravo"
        assert valle["type"] == "municipality"
        assert valle["geometry"] is not None

        # State (15)
        res_state = await ac.get("/api/v1/forest/regions/15")
        assert res_state.status_code == 200
        state = res_state.json()
        assert state["name"] == "Estado de México"
        assert state["type"] == "state"


@pytest.mark.asyncio
async def test_get_geojson_layers():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_state = await ac.get("/api/v1/forest/geojson/state")
        assert res_state.status_code == 200
        assert res_state.json()["type"] == "FeatureCollection"

        res_mun = await ac.get("/api/v1/forest/geojson/municipalities")
        assert res_mun.status_code == 200
        data_mun = res_mun.json()
        assert data_mun["type"] == "FeatureCollection"
        assert len(data_mun["features"]) == 125


@pytest.mark.asyncio
async def test_get_annual_stats_and_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Valid request
        res = await ac.get("/api/v1/forest/stats/annual?region_id=15110&from=2010&to=2025")
        assert res.status_code == 200
        data = res.json()
        assert data["region_name"] == "Valle de Bravo"
        assert len(data["series"]) == 16
        assert data["data_status"] == "pending_ingest"

        # Invalid date range
        res_invalid = await ac.get("/api/v1/forest/stats/annual?region_id=15110&from=2025&to=2010")
        assert res_invalid.status_code == 400


@pytest.mark.asyncio
async def test_get_loss_stats():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/forest/stats/loss?region_id=15101&from=2010&to=2025")
        assert res.status_code == 200
        data = res.json()
        assert "scientific_disclaimer" in data
        assert len(data["series"]) == 16


@pytest.mark.asyncio
async def test_get_layers():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/forest/layers?year=2025")
        assert res.status_code == 200
        layers = res.json()
        assert len(layers) >= 2
