from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.schemas.carbon import (
    CarbonEstimateRequest,
    CarbonEstimateResponse,
)
from app.services.carbon_service import CarbonService, ALLOMETRIC_PROFILES

router = APIRouter(prefix="/carbon", tags=["Carbon"])


@router.get("/equations")
async def list_allometric_equations():
    """Returns the catalog of validated regional allometric equations for Estado de México."""
    equations = []
    for sp_id, prof in ALLOMETRIC_PROFILES.items():
        equations.append({
            "species_id": sp_id,
            "scientific_name": prof["scientific_name"],
            "common_name": prof["common_name"],
            "equation_code": prof["equation_code"],
            "citation": prof["citation"],
            "carbon_fraction": prof["carbon_fraction"],
            "co2e_multiplier": prof["co2e_multiplier"],
            "valid_dbh_range_cm": list(prof["valid_dbh_range"]),
        })
    return equations


@router.post("/estimate", response_model=CarbonEstimateResponse)
async def estimate_carbon(
    request: CarbonEstimateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Computes an allometric biomass and carbon stock estimate from geometry or area,
    validating trees count and DBH parameters.
    """
    try:
        return CarbonService.estimate_carbon(request)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating carbon allometry: {str(e)}")
