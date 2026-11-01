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
    """Happy Path: Point strictly inside with high GNSS accuracy."""
    lat = 19.2885
    lon = -99.6550
    accuracy_m = 4.5

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert status == "VALID"
    assert diag["is_inside"] is True
    assert diag["distance_to_boundary_m"] == 0.0


def test_point_inside_with_degraded_accuracy_warning():
    """Edge Case: Inside, but accuracy is above canopy threshold (15m < acc <= 30m)."""
    lat = 19.2885
    lon = -99.6550
    accuracy_m = 20.0  # Above 15m canopy warning threshold

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert status == "WARNING"
    assert diag["is_inside"] is True


def test_point_boundary_touch_edge_case():
    """Edge Case: Point directly touching the polygon boundary vertex."""
    # North-west vertex
    lat = 19.2895
    lon = -99.6560
    accuracy_m = 5.0

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert diag["is_inside"] is True
    assert status == "VALID"


def test_point_slightly_outside_within_accuracy():
    """Edge Case: Point is just outside, but deviation is within GPS accuracy error margin."""
    lat = 19.2885
    lon = -99.65395  # ~5m outside east boundary
    accuracy_m = 10.0

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is True
    assert status == "WARNING"
    assert diag["is_inside"] is False
    assert diag["distance_to_boundary_m"] > 0
    assert diag["distance_to_boundary_m"] <= accuracy_m


def test_point_far_outside():
    """Edge Case: Point is far outside the assigned polygon."""
    lat = 19.2800
    lon = -99.6400
    accuracy_m = 5.0

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is False
    assert status == "INVALID"
    assert diag["is_inside"] is False


def test_point_with_unacceptable_accuracy():
    """Edge Case: Sensor reporting degraded precision > 30m threshold."""
    lat = 19.2885
    lon = -99.6550
    accuracy_m = 55.0  # Exceeds max threshold (30m)

    is_valid, status, diag = check_geofence(lat, lon, accuracy_m, SAMPLE_POLYGON)
    assert is_valid is False
    assert status == "INVALID"


def test_accuracy_none_fallback_edge_case():
    """Edge Case: Device fails to provide accuracy (None). Must fail gracefully without exception."""
    lat = 19.2885
    lon = -99.6550
    is_valid, status, diag = check_geofence(lat, lon, accuracy_m=None, plot_geometry=SAMPLE_POLYGON)
    assert is_valid is False
    assert status == "INVALID"
    assert diag["accuracy_m"] is None


def test_boundary_threshold_exact_transitions():
    """Edge Case: Exact values on thresholds (15.0m vs 15.01m, 30.0m vs 30.01m)."""
    lat = 19.2885
    lon = -99.6550

    # At exact 15.0m, acc is NOT > 15.0 -> VALID
    valid, status, _ = check_geofence(lat, lon, accuracy_m=15.0, plot_geometry=SAMPLE_POLYGON)
    assert valid is True
    assert status == "VALID"

    # At 15.01m, acc > 15.0 -> WARNING
    valid, status, _ = check_geofence(lat, lon, accuracy_m=15.01, plot_geometry=SAMPLE_POLYGON)
    assert valid is True
    assert status == "WARNING"

    # At exact 30.0m, acc is NOT > 30.0 -> VALID (as WARNING since > 15)
    valid, status, _ = check_geofence(lat, lon, accuracy_m=30.0, plot_geometry=SAMPLE_POLYGON)
    assert valid is True
    assert status == "WARNING"

    # At 30.01m, acc > 30.0 -> INVALID
    valid, status, _ = check_geofence(lat, lon, accuracy_m=30.01, plot_geometry=SAMPLE_POLYGON)
    assert valid is False
    assert status == "INVALID"


def test_multipolygon_support():
    """Edge Case: Plot composed of MultiPolygon (two disconnected parcels)."""
    multi_poly = {
        "type": "MultiPolygon",
        "coordinates": [
            [
                [
                    [-99.6560, 19.2875],
                    [-99.6540, 19.2875],
                    [-99.6540, 19.2895],
                    [-99.6560, 19.2895],
                    [-99.6560, 19.2875],
                ]
            ],
            [
                [
                    [-99.6500, 19.2875],
                    [-99.6480, 19.2875],
                    [-99.6480, 19.2895],
                    [-99.6500, 19.2895],
                    [-99.6500, 19.2875],
                ]
            ],
        ]
    }
    # Point inside second parcel
    is_valid, status, diag = check_geofence(19.2885, -99.6490, 5.0, multi_poly)
    assert is_valid is True
    assert diag["is_inside"] is True
    assert status == "VALID"


def test_polygon_with_interior_donut_hole():
    """Edge Case: Polygon containing an excluded interior ring (hole)."""
    donut_polygon = {
        "type": "Polygon",
        "coordinates": [
            # Exterior ring
            [
                [-99.6600, 19.2800],
                [-99.6400, 19.2800],
                [-99.6400, 19.3000],
                [-99.6600, 19.3000],
                [-99.6600, 19.2800],
            ],
            # Interior hole (excluded lake/ravine)
            [
                [-99.6550, 19.2850],
                [-99.6450, 19.2850],
                [-99.6450, 19.2950],
                [-99.6550, 19.2950],
                [-99.6550, 19.2850],
            ],
        ]
    }
    # Point inside the exclusion hole
    is_valid, status, diag = check_geofence(19.2900, -99.6500, 2.0, donut_polygon)
    assert diag["is_inside"] is False
    assert is_valid is False
    assert status == "INVALID"
