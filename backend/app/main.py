"""PRISMA AI backend entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.api.routes.websocket import router as websocket_router
from app.core.config import settings
from app.db.init_db import init_db
from app.simulations.simulator import run_simulator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("prisma")


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop_event = asyncio.Event()
    task: asyncio.Task | None = None

    try:
        await asyncio.to_thread(init_db)
    except SQLAlchemyError:
        logger.exception("Inisialisasi database gagal. API tetap berjalan dalam mode terbatas.")

    if settings.SIMULATION_MODE:
        task = asyncio.create_task(run_simulator(stop_event))
        logger.info("SIMULATION MODE aktif — data proses dihasilkan simulator, bukan sensor nyata.")

    yield

    stop_event.set()
    if task is not None:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):  # noqa: BLE001
            pass


app = FastAPI(
    title="PRISMA AI API",
    description=(
        "Industrial AI Monitoring & Decision Support — studi kasus produksi ClO₂. "
        "Sistem ini bersifat decision support: tidak ada pengendalian peralatan otomatis."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expose both v1 enterprise prefix and base api prefix for full compatibility
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Never leak a stack trace to the operator screen."""
    logger.exception("Kesalahan database pada %s", request.url.path)
    return JSONResponse(
        status_code=503,
        content={"detail": "Layanan data tidak tersedia. Coba lagi beberapa saat lagi."},
    )


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {
        "name": settings.APP_NAME,
        "docs": "/docs",
        "api": settings.API_PREFIX,
        "mode": "SIMULATION" if settings.SIMULATION_MODE else "LIVE",
    }
