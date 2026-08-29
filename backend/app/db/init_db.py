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
from app.models import KnowledgeDocument, Process, ProcessParameter
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

KNOWLEDGE_SEED = [
    {
        "title": "SOP Pengendalian Konsentrasi ClO₂",
        "doc_type": "SOP",
        "reference_code": "SOP-CLO2-01",
        "version": "3.1",
        "summary": "Langkah pengendalian ketika konsentrasi ClO₂ mendekati atau melewati batas atas.",
        "tags": ["clo2_concentration", "so2_dosage", "ph"],
        "content": (
            "1. Verifikasi pembacaan analyzer terhadap hasil laboratorium terakhir.\n"
            "2. Periksa dosis SO₂ terhadap set point yang berlaku pada laju produksi saat ini.\n"
            "3. Periksa pH larutan umpan; pH di bawah rentang mempercepat pembentukan ClO₂.\n"
            "4. Jika konsentrasi tetap di atas batas atas selama lebih dari 15 menit, "
            "turunkan laju produksi sesuai instruksi supervisor shift.\n"
            "5. Catat seluruh tindakan pada logsheet dan sistem audit."
        ),
    },
    {
        "title": "Rentang Operasi Normal Generator ClO₂",
        "doc_type": "Rentang Operasi",
        "reference_code": "OPR-CLO2-02",
        "version": "2.0",
        "summary": "Rentang operasi yang dijadikan acuan deteksi penyimpangan pada dashboard.",
        "tags": ["clo2_concentration", "ph", "flow_rate", "temperature", "pressure"],
        "content": (
            "Konsentrasi ClO₂: 5,0–9,0 mg/L (target 8,5)\n"
            "Suhu reaktor: 12,0–18,0 °C (target 15,0)\n"
            "Tekanan: 8,5–10,5 bar (target 9,5)\n"
            "pH: 4,0–5,0 (target 4,5)\n"
            "Laju alir: 25,0–30,0 m³/jam (target 28,0)\n"
            "Dosis SO₂: 0,35–0,55 kg/jam (target 0,42)\n"
            "ORP: 150–220 mV (target 180)\n"
            "Turbiditas: 0,0–1,5 NTU (target 0,8)"
        ),
    },
    {
        "title": "Troubleshooting pH Turun di Bawah Target",
        "doc_type": "Troubleshooting",
        "reference_code": "TRB-PH-04",
        "version": "1.4",
        "summary": "Penyebab umum dan pemeriksaan awal ketika pH bergerak turun.",
        "tags": ["ph", "so2_dosage"],
        "content": (
            "Penyebab umum:\n"
            "• Dosis SO₂ berlebih terhadap laju umpan klorat.\n"
            "• Kalibrasi probe pH sudah kedaluwarsa.\n"
            "• Perubahan konsentrasi larutan umpan.\n\n"
            "Pemeriksaan awal:\n"
            "1. Bandingkan pembacaan probe dengan pengukuran manual.\n"
            "2. Periksa tanggal kalibrasi terakhir.\n"
            "3. Periksa stroke dosing pump SO₂ dan tekanan suplai."
        ),
    },
    {
        "title": "Prosedur Pengambilan Sampel dan Verifikasi Laboratorium",
        "doc_type": "Prosedur",
        "reference_code": "PRC-LAB-07",
        "version": "1.0",
        "summary": "Cara memverifikasi pembacaan analyzer dengan hasil laboratorium.",
        "tags": ["clo2_concentration", "turbidity"],
        "content": (
            "1. Gunakan APD lengkap sebelum mengambil sampel.\n"
            "2. Bilas sampling line minimal 30 detik.\n"
            "3. Ambil sampel pada titik SP-02 dan tutup rapat wadah.\n"
            "4. Serahkan ke laboratorium dengan label waktu pengambilan.\n"
            "5. Bandingkan hasil dengan pembacaan analyzer pada waktu yang sama."
        ),
    },
    {
        "title": "Kinetika Reaksi & Neraca Massa Integrated ClO₂ Plant",
        "doc_type": "Teori Proses",
        "reference_code": "DOC-CLO2-KB01",
        "version": "2.0",
        "summary": "Teori proses reaksi generator Mathieson/ERCO R3, elektrolisis klorat, dan absorpsi ClO₂.",
        "tags": ["clo2_concentration", "reaction_efficiency", "temperature", "flow_rate"],
        "content": (
            "1. Sodium Chlorate Electrolysis: 2NaCl + 6H₂O + Listrik -> 2NaClO₃ + 6H₂.\n"
            "2. ClO₂ Generation: 2NaClO₃ + 4.8HCl -> 1.8ClO₂ + 2NaCl + 2.4H₂O + 1.5Cl₂.\n"
            "3. HCl Synthesis: 2.4H₂ + 2.4Cl₂ -> 4.8HCl.\n"
            "Target konsentrasi larutan ClO₂ produk di absorber adalah 9–11 g/L. "
            "Kestabilan suhu pendingin (chilled water) dan laju alir absorber H₂O menentukan efektivitas penyerapan gas."
        ),
    },
    {
        "title": "Panduan Standar Operasional Penyesuaian Lapangan 4-Tingkat",
        "doc_type": "SOP Lapangan",
        "reference_code": "SOP-CLO2-ADJ04",
        "version": "1.5",
        "summary": "Aturan penyesuaian bertahap: Prioritas 1 Absorber, Prioritas 2 Generator, Prioritas 3 Kualitas Kimia, Prioritas 4 Validasi Lab.",
        "tags": ["clo2_concentration", "so2_dosage", "ph", "flow_rate"],
        "content": (
            "Hierarki Penyesuaian Bertahap:\n"
            "• Prioritas 1 (Absorber): Evaluasi laju air absorber dan jaga kestabilan suhu chilled water.\n"
            "• Prioritas 2 (Generator): Koreksi rasio HCl dan NaClO₃ Feed secara bertahap (2–5% per interval 15 menit).\n"
            "• Prioritas 3 (Kualitas): Periksa konsentrasi HCl (±32%) dan strong chlorate (460 g/L).\n"
            "• Prioritas 4 (Validasi): Konfirmasi trend DCS dan titrasi lab iodometri sebelum perubahan drastis."
        ),
    },
    {
        "title": "Model Prediksi Regresi Linier Berganda (MLR) & Analisis Dominansi T-Value",
        "doc_type": "Riset Prediktif",
        "reference_code": "MLR-CLO2-MOD01",
        "version": "1.0",
        "summary": "Persamaan regresi empiris Y = f(X1..X10) dan urutan signifikansi parameter operasional.",
        "tags": ["clo2_concentration", "production_capacity", "reaction_efficiency"],
        "content": (
            "Persamaan MLR:\n"
            "Y = 3.11 - 0.1407*X1 + 0.003192*X2 + 0.00613*X3 + 0.799*X4 + 0.2343*X5 - 0.0220*X7 - 0.0607*X9 - 0.02148*X10\n\n"
            "Dominansi |T-Value|: (1) X5 Konsentrasi HCl, (2) X2 Konsentrasi NaClO₃, (3) X3 Konsentrasi NaCl, "
            "(4) X4 Umpan HCl, (5) X1 Umpan NaClO₃, (6) X10 Laju Air Absorber, (7) X7 Suhu Generator, (8) X9 Suhu Air Pendingin."
        ),
    },
    {
        "title": "Standar Batas Toleransi Error Prediksi & Evaluasi Lab",
        "doc_type": "Kriteria KPI",
        "reference_code": "TOL-CLO2-KPI02",
        "version": "1.1",
        "summary": "Kriteria evaluasi deviasi prediksi terhadap analisa aktual lab.",
        "tags": ["clo2_concentration", "turbidity"],
        "content": (
            "Evaluasi Akurasi Prediksi:\n"
            "• Error <= 1%: Sangat Akurat (Target Utama)\n"
            "• Error > 1% s/d 2%: Akurat (Masuk toleransi KPI utama)\n"
            "• Error > 2% s/d 5%: Cukup (Di luar KPI utama, perlu review setpoint)\n"
            "• Error > 5%: Kurang Akurat (Lakukan kalibrasi probe dan validasi reagen lab)"
        ),
    },
    {
        "title": "Catatan Kasus: Kenaikan ClO₂ akibat Dosis SO₂ Berlebih",
        "doc_type": "Kasus Historis",
        "reference_code": "CASE-2024-11",
        "version": "1.0",
        "summary": "Kasus historis dengan pola penyimpangan yang serupa.",
        "tags": ["clo2_concentration", "so2_dosage", "ph"],
        "content": (
            "Kronologi: pH turun bertahap selama 40 menit, dosis SO₂ naik 12% dari set point, "
            "konsentrasi ClO₂ melewati batas atas 25 menit kemudian.\n\n"
            "Tindakan: dosis SO₂ dikembalikan ke set point, pH pulih dalam 20 menit, "
            "konsentrasi ClO₂ kembali normal dalam 35 menit.\n\n"
            "Pelajaran: pemantauan dini pada pH memberi waktu koreksi sebelum "
            "konsentrasi ClO₂ menyimpang."
        ),
    },
    {
        "title": "SOP Mitigasi Kritis Dekomposisi Gas ClO₂ & Suhu Tinggi Generator",
        "doc_type": "SOP Safety",
        "reference_code": "SOP-CLO2-DEC01",
        "version": "2.1",
        "summary": "Protokol darurat saat konsentrasi ClO₂ melebihi 9.80 g/L atau suhu generator melebihi 47°C.",
        "tags": ["clo2_concentration", "pressure", "temperature", "flow_rate"],
        "content": (
            "Prosedur Tindakan Cepat:\n"
            "1. Jika konsentrasi ClO₂ terprediksi/terukur > 9.80 g/L, segera naikkan laju air absorber (X10) secara bertahap 3-5%.\n"
            "2. Turunkan umpan HCl Feed (X4) sebesar 5% untuk meredam laju pembentukan gas berlebih.\n"
            "3. Pastikan aliran gas purge inert (N₂/udara pengencer) mengalir stabil untuk menjaga konsentrasi gas ClO₂ di fasa uap < 10% vol (batas aman ledakan).\n"
            "4. Verifikasi tekanan vakum generator (8.5 - 10.5 kPa)."
        ),
    },
    {
        "title": "SOP Pengendalian Suhu Chilled Water Absorber Column",
        "doc_type": "SOP Operasi",
        "reference_code": "SOP-CHW-ABS02",
        "version": "1.8",
        "summary": "Panduan menjaga temperatur air dingin absorber pada 6°C - 10°C untuk efisiensi penyerapan gas.",
        "tags": ["absorber_water_temperature", "absorber_water_rate", "temperature"],
        "content": (
            "Pengendalian Suhu Absorpsi ClO₂:\n"
            "• Suhu air pendingin absorber (X9) harus dijaga di bawah 9.0°C (optimum 7.0 - 8.5°C).\n"
            "• Setiap kenaikan 1°C pada air pendingin akan menurunkan kelarutan gas ClO₂ dan memicu gas loss ke scrubber.\n"
            "• Periksa kinerja chiller unit dan bersihkan strainer chilled water jika suhu terbaca > 10°C."
        ),
    },
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
    existing_refs = {doc.reference_code for doc in db.scalars(select(KnowledgeDocument)).all()}
    new_docs = [
        KnowledgeDocument(**doc)
        for doc in KNOWLEDGE_SEED
        if doc.get("reference_code") not in existing_refs
    ]
    if new_docs:
        db.add_all(new_docs)
        db.commit()
        logger.info("Seed %s dokumen knowledge base baru", len(new_docs))


import hashlib
from app.models.user import User

USER_SEED = [
    {
        "name": "Administrator",
        "email": "admin@prisma.ai",
        "password_hash": hashlib.sha256(b"admin123").hexdigest(),
        "role": "Admin",
        "is_active": True,
    },
]


def seed_users(db: Session) -> None:
    existing_emails = {u.email for u in db.scalars(select(User)).all()}
    new_users = [User(**u) for u in USER_SEED if u["email"] not in existing_emails]
    if new_users:
        db.add_all(new_users)
        db.commit()
        logger.info("Seed %s pengguna awal ke database", len(new_users))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_users(db)
        process = seed_process(db)
        seed_knowledge(db)
        if settings.SIMULATION_MODE:
            seed_history(db, process.id, settings.SIMULATION_SEED_HOURS, SEED_INTERVAL_SECONDS)
        else:
            # In Production Mode: Seed the 288 real plant dataset records if not present
            from app.models import SensorReading, AIInsight
            from app.db.real_data import REAL_PLANT_READINGS
            from app.services.ai import generate_insight
            from datetime import datetime
            
            existing_count = db.scalar(select(func.count(SensorReading.id)).where(SensorReading.process_id == process.id)) or 0
            if existing_count < 100:
                logger.info("Memasukkan %d data riil pabrik dari Data Fix.xlsx...", len(REAL_PLANT_READINGS))
                db.query(SensorReading).filter(SensorReading.process_id == process.id).delete()
                
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
                        source="actual_plant"
                    ))
                db.add_all(real_objs)
                db.commit()
                logger.info("Berhasil menyimpan %d data riil pabrik ke database!", len(real_objs))

            has_insight = db.scalars(select(AIInsight).where(AIInsight.process_id == process.id).limit(1)).first()
            if not has_insight:
                try:
                    generate_insight(db, process.id)
                    logger.info("Seed AI insight & rekomendasi awal")
                except Exception as e:
                    logger.warning("Gagal generate insight awal: %s", e)
    finally:
        db.close()
