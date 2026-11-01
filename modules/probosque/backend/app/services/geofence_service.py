from typing import Tuple, Dict, Any, Optional
from shapely.geometry import Point, shape, Polygon, MultiPolygon
from shapely.ops import transform
import pyproj

# Geodetic transformer for distance in meters
wgs84 = pyproj.CRS("EPSG:4326")
utm_approx = pyproj.CRS("EPSG:3857")  # Web Mercator or local UTM for distance calculation


def check_geofence(
    lat: float,
    lon: float,
    accuracy_m: Optional[float],
    plot_geometry: Dict[str, Any],
    max_accuracy_threshold_m: float = 30.0,
    canopy_warning_threshold_m: float = 15.0,
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Evaluates technician GPS point against the plot polygon.
    Returns:
    - is_valid: bool
    - geofence_status: 'VALID' | 'WARNING' | 'INVALID'
    - diagnostics: dict with distance_m, accuracy_m, centroid_distance_m
    """
    point = Point(lon, lat)
    geom = shape(plot_geometry)

    is_inside = geom.contains(point) or geom.touches(point)
    centroid = geom.centroid

    # Calculate approximate distance to polygon in meters if outside
    if is_inside:
        distance_to_boundary_m = 0.0
    else:
        # Distance in degrees converted approximately to meters (at equator ~111km/deg)
        # Using geodesic distance via coordinate approximation
        distance_to_boundary_m = float(geom.distance(point) * 111320.0)

    centroid_dist_m = float(centroid.distance(point) * 111320.0)

    diagnostics = {
        "is_inside": is_inside,
        "distance_to_boundary_m": round(distance_to_boundary_m, 2),
        "centroid_distance_m": round(centroid_dist_m, 2),
        "accuracy_m": accuracy_m,
    }

    # Accuracy check
    acc = accuracy_m if accuracy_m is not None else 999.0

    if acc > max_accuracy_threshold_m:
        return False, "INVALID", diagnostics

    if not is_inside:
        # If outside but within GPS accuracy error margin
        if distance_to_boundary_m <= acc:
            return True, "WARNING", diagnostics
        return False, "INVALID", diagnostics

    if acc > canopy_warning_threshold_m:
        return True, "WARNING", diagnostics

    return True, "VALID", diagnostics
