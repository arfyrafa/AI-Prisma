"""Aggregated API router."""

from fastapi import APIRouter

from app.api.routes import (
    agent,
    alerts,
    audit,
    auth,
    health,
    ingestion,
    insights,
    knowledge,
    ml,
    predictions,
    processes,
    recommendations,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(processes.router)
api_router.include_router(alerts.router)
api_router.include_router(predictions.router)
api_router.include_router(insights.router)
api_router.include_router(recommendations.router)
api_router.include_router(agent.router)
api_router.include_router(knowledge.router)
api_router.include_router(audit.router)
api_router.include_router(ingestion.router)
api_router.include_router(ml.router)
