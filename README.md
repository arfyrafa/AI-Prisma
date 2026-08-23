# PRISMA AI — Industrial AI Monitoring & Decision Support

Dashboard web untuk memantau proses industri, mendeteksi penyimpangan, menampilkan prediksi,
dan menyajikan rekomendasi yang dapat dijelaskan. Studi kasus awal: **proses produksi ClO₂**.

Alur produk yang diwujudkan aplikasi ini:

```
Data Operasional → Validasi → Prediksi → Analisis → Rekomendasi → Verifikasi Engineer
```

Sistem ini **decision support**, bukan sistem kendali. Tidak ada endpoint, tombol, atau proses
latar belakang yang mengubah parameter peralatan. Keputusan akhir selalu milik engineer.

---

## 1. Menjalankan dengan Docker (cara yang disarankan)

Prasyarat: Docker Desktop / Docker Engine dengan Docker Compose v2.

```bash
cp .env.example .env      # opsional, nilai default sudah bisa dipakai
docker compose up --build
```

Tunggu sampai ketiga container sehat (build pertama 3–6 menit), lalu buka:

| Alamat | Isi |
| --- | --- |
| http://localhost:8080 | Dashboard PRISMA AI |
| http://localhost:8000/docs | Dokumentasi API interaktif (Swagger) |
| http://localhost:8000/api/health | Status layanan |

Saat pertama kali dijalankan, backend otomatis membuat skema database, mengisi parameter proses
dan Knowledge Base, lalu men-seed riwayat 24 jam agar grafik dan model regresi langsung berisi.
Simulator kemudian menghasilkan pembacaan baru setiap 5 detik.

Menghentikan:

```bash
docker compose down          # hentikan
docker compose down -v       # hentikan sekaligus hapus data database
```

## 2. Menjalankan tanpa Docker (mode pengembangan)

Backend (butuh Python 3.11+ dan PostgreSQL yang sudah berjalan):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg2://prisma:prisma@localhost:5432/prisma_ai"
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, sudah diproxy ke backend :8000
```

---

## 3. Arsitektur

```
SENSOR / DCS / SCADA / AI Agent (OpenClaw)
                 │  JSON / REST
                 ▼
         ┌───────────────┐
         │    FastAPI    │──── PostgreSQL
         │    Backend    │──── ML / Agent Integration
         └───────┬───────┘
                 │  REST + WebSocket
                 ▼
        React Web Dashboard
```

Aturan yang dipegang konsisten di seluruh kode:

- Frontend **tidak pernah** menyentuh database, dan tidak pernah memanggil AI Agent langsung.
- Frontend **tidak pernah** menghitung status parameter sendiri; status datang dari backend
  sehingga mengubah rentang operasi di halaman Pengaturan langsung mengubah seluruh sistem.
- AI Agent dan model prediktif berada di balik antarmuka abstrak — ditukar lewat `.env`.

Struktur direktori:

```
prisma-ai/
├── backend/app/
│   ├── api/routes/       endpoint REST + WebSocket
│   ├── models/           tabel SQLAlchemy
│   ├── schemas/          kontrak API (Pydantic)
│   ├── repositories/     query database
│   ├── services/         logika bisnis (deviasi, alert, AI, prediksi, audit)
│   ├── integrations/     adapter agent & model prediktif (base/mock/openclaw)
│   ├── simulations/      simulator proses ClO₂
│   └── realtime/         manajer koneksi WebSocket
├── frontend/src/
│   ├── components/       komponen UI yang dapat dipakai ulang
│   ├── pages/            10 halaman aplikasi
│   ├── hooks/            data live (WebSocket + fallback polling)
│   ├── services/         klien API terpusat
│   └── types/            tipe yang mencerminkan kontrak backend
└── docs/                 skenario demo, referensi API, catatan arsitektur
```

---

## 4. Menghubungkan AI Agent (OpenClaw)

Secara default `AGENT_PROVIDER=mock`: agent simulasi berbasis aturan yang membaca data proses
nyata dari database. Semua keluarannya berlabel `mock-agent`, dan **tidak pernah** melaporkan
confidence score yang dikarang.

Untuk beralih ke agent sungguhan, ubah `.env`:

```env
AGENT_PROVIDER=openclaw
AGENT_API_URL=http://alamat-agent:9000
AGENT_API_KEY=kunci-rahasia
```

Agent tersebut cukup menyediakan tiga endpoint:

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /analyze` | `{ "context": {...} }` | `{ "insight": {...}, "recommendations": [...] }` |
| `POST /chat` | `{ "context": {...}, "message": "...", "history": [...] }` | `{ "reply": "...", "related_parameters": [...] }` |
| `GET /health` | — | status < 400 bila agent siap |

Isi `context` (parameter, rentang operasi, penyimpangan, tren, referensi Knowledge Base) dibangun
di `backend/app/services/ai.py`. Bentuk lengkapnya ada di `docs/API.md`.

Bila agent mati atau membalas format tak dikenal, backend membalas `503` dan dashboard menampilkan
status "AI Agent sedang tidak tersedia" — pemantauan, deteksi penyimpangan, dan alert tetap jalan.
Tidak ada jawaban AI yang dikarang saat agent tidak tersedia.

---

## 5. Mengirim data sensor sungguhan

Matikan simulator (`SIMULATION_MODE=false`), lalu kirim pembacaan ke:

```bash
curl -X POST http://localhost:8000/api/ingestion/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "process_id": 1,
    "timestamp": "2026-08-16T15:20:00Z",
    "source": "dcs",
    "parameters": {
      "clo2_concentration": 9.5,
      "temperature": 15.2,
      "pressure": 9.7,
      "ph": 4.3,
      "flow_rate": 27.5,
      "so2_dosage": 0.48,
      "orp": 182,
      "turbidity": 0.8
    }
  }'
```

Payload divalidasi Pydantic (field wajib, tipe numerik, timestamp, process_id, nama parameter).
Payload tak dikenal ditolak dengan pesan yang jelas. Kunci lama `co2_concentration` tetap
diterima sebagai alias dari `clo2_concentration`.

Satu permintaan langsung memicu: simpan pembacaan → evaluasi rentang operasi → buat/perbarui/
selesaikan alert → siarkan lewat WebSocket ke seluruh dashboard yang terbuka.

---

## 6. Catatan kejujuran data

- Selama `SIMULATION_MODE=true`, header dashboard menampilkan banner **SIMULATION MODE** dan
  setiap pembacaan disimpan dengan `source="simulation"`.
- Hasil prediksi ditandai `is_simulated` selama modelnya dilatih dari data studi kasus.
- Confidence score hanya ditampilkan bila agent benar-benar melaporkannya.
- Rekomendasi selalu disertai peringatan bahwa verifikasi engineer diperlukan, dan keputusan
  engineer disimpan terpisah dari rekomendasi AI.

## 7. Dokumen lain

- `docs/DEMO.md` — skenario demo kompetisi 5 menit
- `docs/API.md` — daftar endpoint dan bentuk payload
- `docs/ARCHITECTURE.md` — keputusan desain dan jalur pengembangan lanjutan
