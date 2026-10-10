from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.plots import router as plots_router
from app.api.v1.audits import router as audits_router
from app.api.v1.sync import router as sync_router
from app.api.v1.decisions import router as decisions_router
from app.api.v1.carbon import router as carbon_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(plots_router)
api_router.include_router(audits_router)
api_router.include_router(sync_router)
api_router.include_router(decisions_router)
api_router.include_router(carbon_router)
