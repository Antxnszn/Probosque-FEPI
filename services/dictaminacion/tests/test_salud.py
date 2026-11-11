from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_salud():
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["servicio"] == "dictaminacion"
    assert cuerpo["requisito"] == "REQ-03"
    assert cuerpo["estado"] == "disponible"


def test_negocio_pendiente():
    respuesta = client.get("/api/dictaminacion/v1/pendiente")
    assert respuesta.status_code == 501
    assert respuesta.json()["codigo"] == "PENDIENTE"
