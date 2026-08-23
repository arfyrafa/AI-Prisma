"""Provider selection. Swapping MOCK MODE for OPENCLAW MODE happens here."""

from functools import lru_cache

from app.core.config import settings
from app.integrations.agent.base import AgentProvider
from app.integrations.agent.mock import MockAgentProvider
from app.integrations.agent.openclaw import OpenClawAgentProvider
from app.integrations.predictive.base import PredictiveModel
from app.integrations.predictive.mock import MockPredictiveModel
from app.integrations.predictive.regression import LinearRegressionModel


@lru_cache
def get_agent_provider() -> AgentProvider:
    if settings.AGENT_PROVIDER.lower() == "openclaw":
        return OpenClawAgentProvider(
            base_url=settings.AGENT_API_URL,
            api_key=settings.AGENT_API_KEY,
            timeout=settings.AGENT_TIMEOUT_SECONDS,
        )
    return MockAgentProvider()


@lru_cache
def get_predictive_model() -> PredictiveModel:
    provider = settings.PREDICTIVE_PROVIDER.lower()
    if provider == "mock":
        return MockPredictiveModel()
    return LinearRegressionModel()
