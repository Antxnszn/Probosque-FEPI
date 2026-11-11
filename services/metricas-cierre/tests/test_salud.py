from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_salud():
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["servicio"] == "metricas-cierre"
    assert cuerpo["requisito"] == "REQ-05"
    assert cuerpo["estado"] == "disponible"


def test_negocio_pendiente():
    respuesta = client.get("/api/metricas-cierre/v1/pendiente")
    assert respuesta.status_code == 501
    assert respuesta.json()["codigo"] == "PENDIENTE"
