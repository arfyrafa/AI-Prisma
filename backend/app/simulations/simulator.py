"""ClO2 process simulator.

Generates a physically plausible reading stream so the whole pipeline can be
demonstrated without a real sensor, DCS or historian. Every reading it writes
is stored with ``source="simulation"`` and the dashboard shows a SIMULATION
MODE banner: simulated data is never presented as production data.

Scenario loop (matches the demo script in the PRD):
    normal -> pH drifts down -> SO2 dosage rises -> ClO2 climbs past the
    upper limit -> deviation + alert -> recovery -> normal
"""

import asyncio
import logging
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.db.session import SessionLocal
from app.realtime import connection_manager
from app.repositories import readings as reading_repo
from app.schemas import AlertOut, Deviation, SensorReadingOut
from app.services.monitoring import record_reading

logger = logging.getLogger(__name__)

BASELINE = {
    "clo2_concentration": 9.72,
    "flow_rate": 17.37,  # NaClO3 Feed (m³/h)
    "reaction_efficiency": 437.16,  # NaClO3 Conc (g/L)
    "orp": 95.5,  # NaCl Conc (g/L)
    "so2_dosage": 4.13,  # HCl Feed (m³/h)
    "ph": 31.55,  # HCl Conc (%)
    "pressure": 46.7,  # Generator Temp (°C)
    "temperature": 8.42,  # Absorber Water Temp (°C)
    "production_capacity": 104.78,  # Absorber Water Rate (m³/h)
}

NOISE = {
    "clo2_concentration": 0.03,
    "flow_rate": 0.08,
    "reaction_efficiency": 1.2,
    "orp": 0.5,
    "so2_dosage": 0.04,
    "ph": 0.15,
    "pressure": 0.2,
    "temperature": 0.1,
    "production_capacity": 0.6,
}

# Phase -> (duration in ticks, per-tick drift applied to the baseline)
PHASES: list[tuple[str, int, dict[str, float]]] = [
    ("normal", 30, {}),
    (
        "drift",
        20,
        {"so2_dosage": 0.02, "clo2_concentration": 0.015, "pressure": 0.1},
    ),
    (
        "deviation",
        15,
        {"so2_dosage": 0.04, "clo2_concentration": 0.025, "temperature": 0.15},
    ),
    (
        "recovery",
        25,
        {"so2_dosage": -0.05, "clo2_concentration": -0.03, "pressure": -0.1},
    ),
]


@dataclass
class SimulatorState:
    phase_index: int = 0
    tick: int = 0
    values: dict[str, float] = field(default_factory=lambda: dict(BASELINE))

    @property
    def phase(self) -> str:
        return PHASES[self.phase_index][0]

    def advance(self) -> dict[str, float]:
        name, duration, drift = PHASES[self.phase_index]

        for key, delta in drift.items():
            self.values[key] += delta

        # Pull everything gently back toward baseline during quiet phases.
        if name in ("normal", "recovery"):
            for key, base in BASELINE.items():
                self.values[key] += (base - self.values[key]) * 0.06

        reading = {
            key: round(value + random.gauss(0, NOISE[key]), 3)
            for key, value in self.values.items()
        }
        reading["orp"] = round(reading["orp"], 1)

        self.tick += 1
        if self.tick >= duration:
            self.tick = 0
            self.phase_index = (self.phase_index + 1) % len(PHASES)
        return reading


state = SimulatorState()


def _write_tick(values: dict[str, float], phase: str) -> dict | None:
    """Runs in a worker thread: DB access here is synchronous by design."""
    db = SessionLocal()
    try:
        process = reading_repo.get_process(db, 1)
        if process is None:
            return None
        reading, deviations, created = record_reading(
            db, process.id, values, source="simulation"
        )
        return {
            "reading": SensorReadingOut.model_validate(reading).model_dump(),
            "deviations": [Deviation.model_validate(d).model_dump() for d in deviations],
            "alerts": [AlertOut.model_validate(a).model_dump() for a in created],
            "phase": phase,
        }
    except Exception:  # noqa: BLE001 - the simulator must never kill the app
        logger.exception("Simulator gagal menulis pembacaan")
        db.rollback()
        return None
    finally:
        db.close()


async def run_simulator(stop_event: asyncio.Event) -> None:
    interval = max(1.0, settings.SIMULATION_INTERVAL_SECONDS)
    logger.info("Simulator aktif (interval=%ss)", interval)
    while not stop_event.is_set():
        values = state.advance()
        payload = await asyncio.to_thread(_write_tick, values, state.phase)
        if payload:
            await connection_manager.broadcast("reading", payload)
            for alert in payload["alerts"]:
                await connection_manager.broadcast("alert", alert)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except asyncio.TimeoutError:
            continue
    logger.info("Simulator dihentikan")


def seed_history(db, process_id: int, hours: int, interval_seconds: float) -> int:
    """Backfill history so charts and the regression model have data at first boot."""
    from app.models import SensorReading

    existing = reading_repo.get_latest_reading(db, process_id)
    if existing is not None:
        return 0

    points = min(int((hours * 3600) / max(interval_seconds, 30)), 4000)
    now = datetime.now(timezone.utc)
    local = SimulatorState()
    rows = []
    for index in range(points):
        values = local.advance()
        rows.append(
            SensorReading(
                process_id=process_id,
                timestamp=now - timedelta(seconds=(points - index) * interval_seconds),
                source="simulation",
                **values,
            )
        )
    db.add_all(rows)
    db.commit()
    logger.info("Seed riwayat simulasi: %s pembacaan", len(rows))
    return len(rows)
