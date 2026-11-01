from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class CarbonResult:
    method: str
    dry_biomass_t_ha: float | None
    total_dry_biomass_t: float | None
    carbon_t: float | None
    co2e_t: float | None
    lower_t: float | None
    upper_t: float | None
    confidence_level: str
    warnings: list[str]


def calculate_from_gedi_l4a(
    mean_agbd_mg_ha: float,
    area_ha: float,
    agbd_pi_lower_mg_ha: float | None = None,
    agbd_pi_upper_mg_ha: float | None = None,
    carbon_fraction: float | None = None,
    co2e_factor: float = 44.01 / 12.01,
) -> CarbonResult:
    """
    Computes aboveground biomass and carbon from GEDI L4A (Mg/ha).
    1 Mg = 1 metric ton.
    Total AGB (t) = mean_agbd_mg_ha * area_ha.
    Total Carbon (t) = total_biomass * carbon_fraction.
    Total CO2e (t) = total_carbon * (44.01 / 12.01).
    """
    if area_ha <= 0:
        raise ValueError("area_ha must be greater than zero")

    total_biomass_t = round(mean_agbd_mg_ha * area_ha, 4)

    carbon_t = None
    co2e_t = None
    lower_t = None
    upper_t = None

    warnings: List[str] = []

    if carbon_fraction is not None:
        if not (0.0 < carbon_fraction <= 1.0):
            raise ValueError("carbon_fraction must be between 0 and 1")
        carbon_t = round(total_biomass_t * carbon_fraction, 4)
        co2e_t = round(carbon_t * co2e_factor, 4)

        if agbd_pi_lower_mg_ha is not None:
            lower_t = round(agbd_pi_lower_mg_ha * area_ha * carbon_fraction * co2e_factor, 4)
        if agbd_pi_upper_mg_ha is not None:
            upper_t = round(agbd_pi_upper_mg_ha * area_ha * carbon_fraction * co2e_factor, 4)
    else:
        warnings.append("Carbon fraction is not configured; biomass is reported without CO2e conversion.")

    return CarbonResult(
        method="GEDI_L4A",
        dry_biomass_t_ha=round(mean_agbd_mg_ha, 4),
        total_dry_biomass_t=total_biomass_t,
        carbon_t=carbon_t,
        co2e_t=co2e_t,
        lower_t=lower_t,
        upper_t=upper_t,
        confidence_level="DATA_DEPENDENT",
        warnings=warnings,
    )


def calculate_from_allometric_equation(
    equation_expression: str,
    species: str,
    tree_density_ha: float,
    area_ha: float,
    variables: Dict[str, float],
    min_dbh_cm: Optional[float] = None,
    max_dbh_cm: Optional[float] = None,
    min_height_m: Optional[float] = None,
    max_height_m: Optional[float] = None,
    carbon_fraction: Optional[float] = 0.47,
    co2e_factor: float = 44.01 / 12.01,
) -> CarbonResult:
    """
    Computes biomass from an approved allometric equation.
    Variables dictionary must supply required symbols (e.g., 'dbh', 'h').
    Fails closed if outside valid calibration ranges.
    """
    # Range validation
    dbh = variables.get("dbh")
    if dbh is not None:
        if min_dbh_cm is not None and dbh < min_dbh_cm:
            raise ValueError(f"DBH {dbh} cm is below calibration minimum {min_dbh_cm} cm for {species}")
        if max_dbh_cm is not None and dbh > max_dbh_cm:
            raise ValueError(f"DBH {dbh} cm exceeds calibration maximum {max_dbh_cm} cm for {species}")

    h = variables.get("h")
    if h is not None:
        if min_height_m is not None and h < min_height_m:
            raise ValueError(f"Height {h} m is below calibration minimum {min_height_m} m for {species}")
        if max_height_m is not None and h > max_height_m:
            raise ValueError(f"Height {h} m exceeds calibration maximum {max_height_m} m for {species}")

    # Evaluate expression in safe math scope
    import math
    safe_scope = {"math": math, "exp": math.exp, "log": math.log, "sqrt": math.sqrt, "pow": math.pow, **variables}
    try:
        # AGB per individual tree in kg
        agb_tree_kg = eval(equation_expression, {"__builtins__": {}}, safe_scope)
    except Exception as e:
        raise ValueError(f"Error evaluating equation '{equation_expression}': {e}")

    # Convert kg/tree to t/ha given tree_density_ha
    # (kg/tree * trees/ha) / 1000 = t/ha
    agb_t_ha = round((agb_tree_kg * tree_density_ha) / 1000.0, 4)
    total_biomass_t = round(agb_t_ha * area_ha, 4)

    carbon_t = None
    co2e_t = None
    warnings: List[str] = []

    if carbon_fraction is not None:
        carbon_t = round(total_biomass_t * carbon_fraction, 4)
        co2e_t = round(carbon_t * co2e_factor, 4)
    else:
        warnings.append("Carbon fraction is not configured; reported as dry biomass only.")

    return CarbonResult(
        method="FIELD_ALLOMETRY",
        dry_biomass_t_ha=agb_t_ha,
        total_dry_biomass_t=total_biomass_t,
        carbon_t=carbon_t,
        co2e_t=co2e_t,
        lower_t=None,
        upper_t=None,
        confidence_level="ALLOMETRY_VALIDATED",
        warnings=warnings,
    )
