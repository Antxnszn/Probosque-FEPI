import pytest
from app.services.geofence_service import check_geofence


# Sample Polygon in Toluca / State of Mexico (Probosque operational area)
# Approximately 1 hectare around 19.288, -99.655
SAMPLE_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [-99.6560, 19.2875],
            [-99.6540, 19.2875],
            [-99.6540, 19.2895],
            [-99.6560, 19.2895],
            [-99.6560, 19.2875],
        ]
    ]
}


def test_point_strictly_inside_with_good_accuracy():
    lat = 19.2885
    lon = -99.6550
    accuracy_m = 4.5

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert status == "VALID"
    assert diag["is_inside"] is True
    assert diag["distance_to_boundary_m"] == 0.0


def test_point_inside_with_degraded_accuracy_warning():
    lat = 19.2885
    lon = -99.6550
    accuracy_m = 20.0  # Above 15m canopy warning threshold

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert status == "WARNING"
    assert diag["is_inside"] is True


def test_point_slightly_outside_within_accuracy():
    # Slightly outside east boundary: lon = -99.65395 (~5m outside)
    lat = 19.2885
    lon = -99.65395
    accuracy_m = 10.0  # Accuracy accommodates the slight boundary deviation

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert status == "WARNING"
    assert diag["is_inside"] is False
    assert diag["distance_to_boundary_m"] > 0


def test_point_far_outside():
    lat = 19.2800
    lon = -99.6400
    accuracy_m = 5.0

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is False
    assert status == "INVALID"
    assert diag["is_inside"] is False


def test_point_with_unacceptable_accuracy():
    lat = 19.2885
    lon = -99.6550
    accuracy_m = 55.0  # Exceeds max threshold (30m)

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is False
    assert status == "INVALID"
