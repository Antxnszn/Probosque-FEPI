from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_salud_propia():
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json()["servicio"] == "orquestador"


def test_fecha_operacion():
    respuesta = client.get("/api/tramite/v1/fecha-operacion")
    assert respuesta.status_code == 200
    assert respuesta.json()["origen"] in {"reloj", "configuracion"}


def test_negocio_pendiente():
    respuesta = client.post("/api/tramite/v1/cuentas")
    assert respuesta.status_code == 501
    assert respuesta.json()["codigo"] == "PENDIENTE"
