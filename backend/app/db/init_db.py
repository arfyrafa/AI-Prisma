"""Schema creation and first-boot seeding.

The MVP creates tables from the SQLAlchemy metadata. Swap this for Alembic
migrations when the schema starts evolving in production.
"""

import logging
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Process, ProcessParameter
from app.simulations.simulator import seed_history

logger = logging.getLogger(__name__)

SEED_INTERVAL_SECONDS = 60.0

PROCESS_SEED = {
    "name": "Proses Produksi ClO₂",
    "description": (
        "Studi kasus awal PRISMA AI. Generator klorin dioksida dengan reduksi "
        "natrium klorat menggunakan SO₂."
    ),
    "status": "active",
}

PARAMETER_SEED = [
    # (name, display, unit, target, min, max)
    ("clo2_concentration", "Konsentrasi ClO₂", "g/L", 9.60, 9.0, 11.0),
    ("naclo3_feed_m3h", "NaClO₃ Feed", "m³/h", 17.37, 14.0, 20.0),
    ("naclo3_concentration_gpl", "NaClO₃ Concentration", "g/L", 437.16, 380.0, 480.0),
    ("nacl_concentration_gpl", "NaCl Concentration", "g/L", 95.5, 80.0, 120.0),
    ("hcl_feed_m3h", "HCl Feed", "m³/h", 4.13, 3.0, 5.5),
    ("hcl_concentration_pct", "HCl Concentration", "%", 31.55, 28.0, 35.0),
    ("generator_temperature_c", "Generator Temperature", "°C", 46.7, 40.0, 55.0),
    ("absorber_water_temperature_c", "Absorber Water Temperature", "°C", 8.42, 4.0, 15.0),
    ("absorber_water_rate_m3h", "Absorber Water Rate", "m³/h", 104.78, 85.0, 120.0),
]




def seed_process(db: Session) -> Process:
    process = db.scalars(select(Process).limit(1)).first()
    if process is None:
        process = Process(
            **PROCESS_SEED,
            data_source="simulation" if settings.SIMULATION_MODE else "external",
        )
        db.add(process)
        db.commit()
        db.refresh(process)
        logger.info("Seed proses: %s", process.name)

    # Ensure obsolete parameters (ph, turbidity, orp, etc.) are purged
    allowed_param_names = {name for name, *rest in PARAMETER_SEED}
    for p in list(process.parameters):
        if p.parameter_name not in allowed_param_names:
            db.delete(p)

    # Clean up obsolete alerts for non-existent parameters
    from app.models import Alert
    for old_alert in db.scalars(select(Alert)).all():
        if old_alert.parameter_name not in allowed_param_names:
            db.delete(old_alert)

    db.commit()

    existing = {p.parameter_name for p in process.parameters}
    added = [
        ProcessParameter(
            process_id=process.id,
            parameter_name=name,
            display_name=display,
            unit=unit,
            target_value=target,
            minimum_value=minimum,
            maximum_value=maximum,
            display_order=index,
        )
        for index, (name, display, unit, target, minimum, maximum) in enumerate(PARAMETER_SEED)
        if name not in existing
    ]
    if added:
        db.add_all(added)
        db.commit()
        logger.info("Seed %s parameter proses", len(added))
    return process


def seed_knowledge(db: Session) -> None:
    """Knowledge base documents are managed by users via the UI. No auto-seeding.
    Clean up old seed documents that were previously auto-inserted."""
    from app.models import KnowledgeDocument
    OLD_SEED_REFS = [
        "SOP-CLO2-01", "OPR-CLO2-02", "TRB-PH-04", "PRC-LAB-07",
        "CASE-2024-11", "DOC-CLO2-KB01", "SOP-CLO2-ADJ04",
        "MLR-CLO2-MOD01", "TOL-CLO2-KPI02", "SOP-CLO2-DEC01", "SOP-CHW-ABS02",
    ]
    deleted = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.reference_code.in_(OLD_SEED_REFS)
    ).delete(synchronize_session="fetch")
    if deleted:
        db.commit()
        logger.info("Dihapus %s dokumen seed lama dari knowledge base", deleted)


import hashlib
from app.models.user import User

USER_SEED = [
    {
        "name": "Administrator",
        "email": "admin@prisma.ai",
        "password": "admin123",
        "role": "Admin",
        "department": "IT & Engineering",
        "is_active": True,
    },
    {
        "name": "Juri 1",
        "email": "juri1@prisma.ai",
        "password": "juri123",
        "role": "Engineer",
        "department": "Dewan Juri",
        "is_active": True,
    },
    {
        "name": "Juri 2",
        "email": "juri2@prisma.ai",
        "password": "juri123",
        "role": "Engineer",
        "department": "Dewan Juri",
        "is_active": True,
    },
    {
        "name": "Operator Demo",
        "email": "operator@prisma.ai",
        "password": "operator123",
        "role": "Operator",
        "department": "Produksi ClO₂",
        "is_active": True,
    },
]


def seed_users(db: Session) -> None:
    for u in USER_SEED:
        pw_hash = hashlib.sha256(u["password"].encode()).hexdigest()
        existing = db.scalar(select(User).where(User.email == u["email"]))
        if existing:
            existing.password_hash = pw_hash
            existing.is_active = True
            existing.name = u["name"]
            existing.role = u["role"]
            if u.get("department"):
                existing.department = u["department"]
            db.commit()
        else:
            db.add(User(
                name=u["name"],
                email=u["email"],
                password_hash=pw_hash,
                role=u["role"],
                department=u.get("department"),
                is_active=True,
            ))
            db.commit()
        logger.info("Verifikasi akun %s (%s) selesai.", u["name"], u["email"])


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Step 1: Users (always safe)
        try:
            seed_users(db)
        except Exception as e:
            db.rollback()
            logger.warning("seed_users gagal: %s", e)

        # Step 2: Process + Parameters
        try:
            process = seed_process(db)
        except Exception as e:
            db.rollback()
            logger.warning("seed_process gagal: %s", e)
            return  # Can't continue without process

        # Step 3: Knowledge Base
        try:
            seed_knowledge(db)
        except Exception as e:
            db.rollback()
            logger.warning("seed_knowledge gagal: %s", e)

        # Step 4: Data seeding
        if settings.SIMULATION_MODE:
            try:
                seed_history(db, process.id, settings.SIMULATION_SEED_HOURS, SEED_INTERVAL_SECONDS)
            except Exception as e:
                db.rollback()
                logger.warning("seed_history gagal: %s", e)
        else:
            try:
                from datetime import datetime
                from app.models import SensorReading, AIInsight, Alert, Recommendation
                from app.db.real_data import REAL_PLANT_READINGS

                latest_reading = db.scalar(
                    select(SensorReading).where(
                        SensorReading.process_id == process.id,
                        SensorReading.source == "actual_plant",
                    ).order_by(SensorReading.timestamp.desc()).limit(1)
                )
                last_target_dt = datetime.fromisoformat(REAL_PLANT_READINGS[-1]["timestamp"].replace("Z", "+00:00"))
                needs_update = (
                    actual_count != len(REAL_PLANT_READINGS)
                    or latest_reading is None
                    or abs((latest_reading.timestamp - last_target_dt).total_seconds()) > 60
                )

                if needs_update:
                    logger.info("Membersihkan data lama dan memasukkan %d data riil shift 8-jam baru...", len(REAL_PLANT_READINGS))
                    db.query(Recommendation).filter(Recommendation.process_id == process.id).delete()
                    db.query(AIInsight).filter(AIInsight.process_id == process.id).delete()
                    db.query(Alert).filter(Alert.process_id == process.id).delete()
                    db.query(SensorReading).filter(SensorReading.process_id == process.id).delete()
                    db.commit()

                    real_objs = []
                    for r in REAL_PLANT_READINGS:
                        dt = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
                        real_objs.append(SensorReading(
                            process_id=process.id,
                            timestamp=dt,
                            clo2_concentration=r["clo2_concentration"],
                            flow_rate=r["flow_rate"],
                            reaction_efficiency=r["reaction_efficiency"],
                            orp=r["orp"],
                            so2_dosage=r["so2_dosage"],
                            ph=r["ph"],
                            pressure=r["pressure"],
                            temperature=r["temperature"],
                            production_capacity=r["production_capacity"],
                            source="actual_plant",
                        ))
                    db.add_all(real_objs)
                    db.commit()
                    logger.info("Berhasil menyimpan %d data riil pabrik ke database!", len(real_objs))
                else:
                    logger.info("Data riil pabrik (%d records) sudah lengkap, skip seeding.", actual_count)
            except Exception as e:
                db.rollback()
                logger.warning("Seeding data riil gagal (backend tetap jalan): %s", e)

            # AI Insight dihilangkan dari startup karena memblokir server.
            # User bisa generate insight on-demand dari halaman Insight AI.

        logger.info("=== PRISMA AI backend siap melayani request ===")
    finally:
        db.close()
