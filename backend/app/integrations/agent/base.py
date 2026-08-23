"""Contract every AI agent provider must satisfy.

The rest of the application only ever talks to this interface, so swapping the
mock provider for OpenClaw is a configuration change, not a rewrite.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


class AgentUnavailableError(RuntimeError):
    """Raised when the external agent cannot be reached or returns an error."""


@dataclass
class ProcessContext:
    """Everything the agent needs to reason about the current condition."""

    process_id: int
    process_name: str
    timestamp: datetime
    parameters: list[dict[str, Any]] = field(default_factory=list)
    deviations: list[dict[str, Any]] = field(default_factory=list)
    recent_trend: dict[str, list[float]] = field(default_factory=dict)
    knowledge_refs: list[dict[str, Any]] = field(default_factory=list)

    def to_payload(self) -> dict[str, Any]:
        return {
            "process_id": self.process_id,
            "process_name": self.process_name,
            "timestamp": self.timestamp.isoformat(),
            "parameters": self.parameters,
            "deviations": self.deviations,
            "recent_trend": self.recent_trend,
            "knowledge_refs": self.knowledge_refs,
        }


@dataclass
class AgentInsight:
    summary: str
    details: str | None = None
    related_parameters: list[str] = field(default_factory=list)
    source: str = "mock-agent"
    # Never invent this. Stays None unless the model actually reports one.
    confidence: float | None = None


@dataclass
class AgentRecommendation:
    recommendation: str
    reason: str | None = None
    suggested_action: str | None = None
    related_parameters: list[str] = field(default_factory=list)
    source: str = "mock-agent"


@dataclass
class AgentAnalysis:
    insight: AgentInsight
    recommendations: list[AgentRecommendation] = field(default_factory=list)


@dataclass
class AgentChatReply:
    reply: str
    source: str = "mock-agent"
    related_parameters: list[str] = field(default_factory=list)


class AgentProvider(ABC):
    """Abstract AI agent (OpenClaw or any other framework)."""

    name: str = "base"

    @abstractmethod
    def is_available(self) -> bool: ...

    @abstractmethod
    def analyze_process(self, context: ProcessContext) -> AgentAnalysis: ...

    @abstractmethod
    def chat(self, context: ProcessContext, message: str, history: list[dict[str, str]]) -> AgentChatReply: ...
