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
        # 1. Ingested region: Valle de Bravo (15110)
        res = await ac.get("/api/v1/forest/stats/annual?region_id=15110&from=2010&to=2025")
        assert res.status_code == 200
        data = res.json()
        assert data["region_name"] == "Valle de Bravo"
        assert len(data["series"]) == 16
        assert data["data_status"] == "ready"
        # Check that 2010 and 2025 series contain real hectares
        s2010 = next((s for s in data["series"] if s["year"] == 2010), None)
        assert s2010 is not None
        c88_2010 = next((c for c in s2010["classes"] if c["code"] == 88), None)
        assert c88_2010 is not None and round(c88_2010["area_ha"]) == 32265
        assert round(s2010["total_forest_approved_ha"]) in (32265, 36906)

        s2025 = next((s for s in data["series"] if s["year"] == 2025), None)
        assert s2025 is not None
        c88_2025 = next((c for c in s2025["classes"] if c["code"] == 88), None)
        assert c88_2025 is not None and round(c88_2025["area_ha"]) == 32281
        assert round(s2025["total_forest_approved_ha"]) in (32281, 36743)

        # 2. Ingested region: Acambay (15001) must return ready with full multitemporal series
        res_acambay = await ac.get("/api/v1/forest/stats/annual?region_id=15001&from=2010&to=2025")
        assert res_acambay.status_code == 200
        assert res_acambay.json()["data_status"] == "ready"
        assert len(res_acambay.json()["series"]) == 16

        # 3. Un-ingested region (e.g. 99999) must return honest pending_ingest
        res_pending = await ac.get("/api/v1/forest/stats/annual?region_id=99999&from=2010&to=2025")
        assert res_pending.status_code == 200
        assert res_pending.json()["data_status"] == "pending_ingest"

        # 4. Invalid date range
        res_invalid = await ac.get("/api/v1/forest/stats/annual?region_id=15110&from=2025&to=2010")
        assert res_invalid.status_code == 400


@pytest.mark.asyncio
async def test_get_loss_stats():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/forest/stats/loss?region_id=15110&from=2010&to=2025")
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
        lc_layer = next((l for l in layers if l["indicator"] == "land_cover"), None)
        assert lc_layer is not None
        assert lc_layer["status"] == "ready"
        assert lc_layer["tile_url_template"] is not None
        assert "earthengine.googleapis.com" in lc_layer["tile_url_template"]
