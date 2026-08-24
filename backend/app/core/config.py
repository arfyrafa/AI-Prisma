"""Application configuration. Sourced from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # --- Application -------------------------------------------------------
    APP_NAME: str = "PRISMA AI"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api"

    # --- Database ----------------------------------------------------------
    DATABASE_URL: str = "postgresql+psycopg2://prisma:prisma@postgres:5432/prisma_ai"

    # --- CORS --------------------------------------------------------------
    # Comma separated list, e.g. "http://localhost:5173,http://localhost:8080"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8080,http://localhost:3000"

    # --- External AI Agent (OpenClaw or 9router) -------------------------
    # AGENT_PROVIDER: "mock" | "openclaw"
    AGENT_PROVIDER: str = "openclaw"
    AGENT_API_URL: str = "http://host.docker.internal:2026/v1"
    AGENT_API_KEY: str = "sk-b3f1a5e1ce5843aa-w9huiy-f9654c92"
    AGENT_TIMEOUT_SECONDS: float = 30.0
    OPENCLAW_MODEL: str = "gpt-4o-mini"

    # --- Predictive model --------------------------------------------------
    # PREDICTIVE_PROVIDER: "regression" | "mock" | "remote"
    PREDICTIVE_PROVIDER: str = "regression"
    MODEL_API_URL: str = ""
    MODEL_API_KEY: str = ""
    PREDICTION_HORIZON_MINUTES: int = 30

    # --- Simulation --------------------------------------------------------
    SIMULATION_MODE: bool = True
    SIMULATION_INTERVAL_SECONDS: float = 5.0
    SIMULATION_SEED_HOURS: int = 24

    # --- Deviation evaluation ---------------------------------------------
    # A reading outside [minimum, maximum] is a WARNING. It escalates to
    # CRITICAL once it exceeds the limit by more than this ratio of the
    # configured operating range (maximum - minimum).
    CRITICAL_MARGIN_RATIO: float = 0.125

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
