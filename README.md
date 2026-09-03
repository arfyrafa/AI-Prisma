<p align="center">
  <img src="docs/prisma-logo.png" alt="PRISMA AI Logo" width="120" />
</p>

<h1 align="center">PRISMA AI</h1>
<h3 align="center">Predictive & Real-time Industrial Smart Monitoring with AI</h3>
<p align="center">
  <em>Industrial AI Decision Support System untuk Proses Produksi ClO₂</em>
</p>

<p align="center">
  <a href="https://aiprisma.tech">🌐 Live Demo</a> •
  <a href="#-akun-demo-untuk-juri">🔑 Akun Juri</a> •
  <a href="#-fitur-utama">✨ Fitur</a> •
  <a href="#-arsitektur">🏗 Arsitektur</a> •
  <a href="#-menjalankan-lokal">🚀 Instalasi</a>
</p>

---

## 📋 Tentang PRISMA AI

**PRISMA AI** adalah platform **Decision Support System** berbasis kecerdasan buatan untuk industri proses kimia. Studi kasus utama: **proses produksi Chlorine Dioxide (ClO₂)** pada pabrik pulp & paper.

Sistem ini membantu engineer dan operator pabrik untuk:
- **Memantau** 9 parameter proses kritis secara real-time
- **Mendeteksi** penyimpangan operasional dengan evaluasi otomatis
- **Memprediksi** tren konsentrasi produk menggunakan model Multiple Linear Regression (MLR)
- **Menerima rekomendasi** aksi berbasis hierarki 4-tingkat yang *actionable*
- **Berdialog** dengan AI Assistant yang memahami konteks proses dan Knowledge Base pabrik
- **Memverifikasi** setiap rekomendasi AI dengan keputusan engineer (*Human-in-the-Loop*)

> **Prinsip utama**: PRISMA AI adalah *decision support*, bukan sistem kendali. Tidak ada endpoint atau proses yang mengubah parameter peralatan. **Keputusan akhir selalu milik engineer.**

---

## 🌐 Live Demo

Aplikasi sudah di-deploy dan dapat diakses langsung:

| Layanan | URL |
|---------|-----|
| **Dashboard PRISMA AI** | [https://aiprisma.tech](https://aiprisma.tech) |
| **API Documentation (Swagger)** | [https://aiprisma.tech/api/docs](https://aiprisma.tech/api/docs) |
| **Health Check** | [https://aiprisma.tech/api/health](https://aiprisma.tech/api/health) |

---

## 🔑 Akun Demo untuk Juri

Gunakan kredensial berikut untuk mengakses sistem:

| Role | Email | Password | Akses |
|------|-------|----------|-------|
| **Admin** | `admin@prisma.ai` | `admin123` | Akses penuh: Dashboard, Pengaturan, Manajemen User, Knowledge Base, AI Chat |
| **Juri 1** | `juri1@prisma.ai` | `juri123` | Engineer view: Dashboard, Monitoring, Prediksi, Rekomendasi, AI Chat |
| **Juri 2** | `juri2@prisma.ai` | `juri123` | Engineer view: Dashboard, Monitoring, Prediksi, Rekomendasi, AI Chat |
| **Operator** | `operator@prisma.ai` | `operator123` | Operator view: Dashboard, Monitoring proses, AI Chat |

> Setiap akun memiliki **riwayat chat AI tersendiri** yang tersimpan di database dan persisten antar sesi login.

---

## ✨ Fitur Utama

### 🖥 Dashboard Real-time
- **9 KPI Card** dengan indikator status hijau/kuning/merah
- **Grafik tren** interaktif (30 menit–24 jam) dengan data WebSocket real-time
- **Pipeline strip** visual alur proses Generator → Absorber → Produk
- **Panel deviasi** otomatis dengan severity WARNING/CRITICAL
- **Alert timeline** dan notifikasi pop-up

### 🤖 AI Assistant (PRISMA Chat)
- **Floating chat widget** dengan konteks proses terintegrasi
- **Domain-aware**: Hanya menjawab pertanyaan seputar proses ClO₂
- **Kalkulasi MLR otomatis**: "Saya ingin menaikkan ke 9,7 g/L" → langsung menghitung ΔY, ΔX₄ (HCl Feed), dan set point baru berdasarkan persamaan regresi
- **Rekomendasi hierarki 4-tingkat**: Absorpsi → Generator → Kualitas Kimia → Validasi Lab
- **Riwayat chat persisten per user** (tersimpan di PostgreSQL)
- **RAG integration**: Menjawab berdasarkan Knowledge Base yang di-upload

### 📊 Model Prediksi MLR
- **Persamaan empiris** dengan 9 parameter proses (8 input + 1 output)
- **T-Value ranking** untuk identifikasi parameter paling berpengaruh
- **Prediksi konsentrasi** ClO₂ 30 menit ke depan
- **Target spesifikasi**: 9.70 – 9.80 g/L

### 📚 Knowledge Base
- Upload dokumen SOP, prosedur, dan referensi teknis melalui UI
- Mendukung format Markdown dengan kode referensi unik
- Pencarian semantik otomatis untuk konteks AI
- Tagging dan kategorisasi dokumen

### 👥 Manajemen User & Keamanan
- Autentikasi berbasis email/password dengan hashing SHA-256
- Role-based access: Admin, Engineer, Operator
- Sesi otomatis kadaluarsa setelah 1 jam
- Manajemen user dari panel Admin

### 🔧 Konfigurasi & Pengaturan
- **Rentang operasi** parameter dapat diubah langsung dari UI
- **Verifikasi engineer** pada setiap rekomendasi AI (Accept/Reject/Modify)
- **Audit trail** lengkap untuk setiap keputusan

---

## 🏗 Arsitektur

```
 SENSOR / DCS / SCADA            AI Engine (OpenClaw / 9Router)
         │                                    │
         │  JSON / REST                       │  LLM Chat Completion
         ▼                                    ▼
┌─────────────────────────────────────────────────────┐
│                   FastAPI Backend                    │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Ingestion │  │ AI Agent │  │ Predictive Model │  │
│  │ & Sensor  │  │ OpenClaw │  │  MLR Regression  │  │
│  └─────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│        │             │                 │             │
│        ▼             ▼                 ▼             │
│  ┌─────────────────────────────────────────────┐     │
│  │         PostgreSQL Database                 │     │
│  │  sensor_readings | alerts | recommendations │     │
│  │  knowledge_docs  | users | chat_messages    │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────┘
                       │  REST + WebSocket
                       ▼
              ┌─────────────────┐
              │  React + Vite   │
              │  Web Dashboard  │
              │  (TypeScript)   │
              └─────────────────┘
```

### Prinsip Desain

- **Frontend tidak menyentuh database** — semua data melalui API backend
- **Frontend tidak menghitung status** — evaluasi parameter dilakukan di backend
- **AI Agent di balik abstraksi** — provider dapat ditukar via environment variable
- **Human-in-the-Loop** — setiap rekomendasi AI memerlukan verifikasi engineer

---

## 🛠 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Recharts, CSS |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| **Database** | PostgreSQL 16 |
| **AI/ML** | scikit-learn (MLR), OpenClaw LLM Integration |
| **Infra** | Docker Compose, Nginx, Ubuntu VPS |

---

## 🚀 Menjalankan Lokal

### Dengan Docker (Direkomendasikan)

Prasyarat: Docker Desktop / Docker Engine dengan Docker Compose v2.

```bash
git clone https://github.com/arfyrafa/AI-Prisma.git
cd AI-Prisma

# Buat file .env dari template
cp .env.example .env

# Jalankan seluruh stack
docker compose up --build
```

Tunggu hingga ketiga container sehat (build pertama 3–6 menit), lalu buka:

| Alamat | Isi |
|--------|-----|
| `http://localhost:8080` | Dashboard PRISMA AI |
| `http://localhost:8000/docs` | API Documentation (Swagger) |
| `http://localhost:8000/api/health` | Health Check |

Saat pertama kali, backend otomatis:
1. Membuat skema database
2. Men-seed akun user (Admin, Juri, Operator)
3. Mengisi parameter proses ClO₂
4. Men-seed riwayat 24 jam agar grafik dan model regresi langsung terisi
5. Simulator menghasilkan pembacaan baru setiap 5 detik

```bash
docker compose down          # hentikan
docker compose down -v       # hentikan + hapus data database
```

### Tanpa Docker (Mode Pengembangan)

**Backend** (Python 3.11+ dan PostgreSQL):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg2://prisma:prisma@localhost:5432/prisma_ai"
uvicorn app.main:app --reload
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

---

## 📂 Struktur Proyek

```
prisma-ai/
├── backend/app/
│   ├── api/routes/          # Endpoint REST + WebSocket
│   ├── core/                # Konfigurasi aplikasi
│   ├── db/                  # Inisialisasi database & seeding
│   ├── models/              # Tabel SQLAlchemy (ORM)
│   ├── schemas/             # Kontrak API (Pydantic)
│   ├── repositories/        # Query database
│   ├── services/            # Logika bisnis (deviasi, alert, AI, prediksi)
│   ├── integrations/
│   │   ├── agent/           # AI Agent adapter (base/mock/openclaw)
│   │   └── predictive/      # Model prediktif (regression/mock)
│   ├── simulations/         # Simulator proses ClO₂
│   └── realtime/            # WebSocket connection manager
├── frontend/src/
│   ├── components/          # 16 komponen UI reusable
│   ├── pages/               # 9 halaman aplikasi
│   ├── hooks/               # Data live (WebSocket + polling fallback)
│   ├── context/             # Auth context & state management
│   ├── services/            # Klien API terpusat
│   └── types/               # TypeScript types
├── docs/                    # Dokumentasi teknis
│   ├── API.md               # Daftar endpoint & payload
│   ├── ARCHITECTURE.md      # Keputusan desain
│   ├── DEMO.md              # Skenario demo
│   └── DEPLOYMENT_GUIDE.md  # Panduan deployment VPS
├── docker-compose.yml       # Orchestration (3 services)
├── deploy.sh                # Script deployment VPS otomatis
└── .env.example             # Template konfigurasi
```

---

## 🔌 Menghubungkan AI Agent

Secara default, agent menggunakan **OpenClaw** dengan fallback ke *industrial domain reasoning engine* berbasis aturan yang membaca data proses nyata dari database.

Untuk mengonfigurasi AI Agent, edit `.env`:

```env
AGENT_PROVIDER=openclaw
AGENT_API_URL=http://alamat-agent:port/v1
AGENT_API_KEY=kunci-rahasia-anda
```

---

## 📡 Mengirim Data Sensor Sungguhan

Matikan simulator (`SIMULATION_MODE=false`), lalu kirim pembacaan ke API:

```bash
curl -X POST http://localhost:8000/api/ingestion/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "process_id": 1,
    "timestamp": "2026-09-03T10:00:00Z",
    "source": "dcs",
    "parameters": {
      "clo2_concentration": 9.72,
      "hcl_feed_m3h": 4.15,
      "naclo3_feed_m3h": 17.40,
      "generator_temperature_c": 46.5,
      "absorber_water_rate_m3h": 104.5
    }
  }'
```

---

## 🔐 Catatan Keamanan & Kejujuran Data

- **Tidak ada API key atau kredensial** yang di-hardcode dalam source code
- Semua secret dibaca dari environment variable (`.env`)
- Selama `SIMULATION_MODE=true`, banner **SIMULATION MODE** ditampilkan di dashboard
- Setiap pembacaan simulasi disimpan dengan `source="simulation"`
- Confidence score hanya ditampilkan bila AI Agent benar-benar melaporkannya
- Rekomendasi selalu disertai peringatan verifikasi engineer diperlukan
- Keputusan engineer disimpan terpisah dari rekomendasi AI (audit trail)

---

## 📄 Dokumen Pendukung

| Dokumen | Isi |
|---------|-----|
| [`docs/API.md`](docs/API.md) | Daftar endpoint dan format payload |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Keputusan desain dan roadmap |
| [`docs/DEMO.md`](docs/DEMO.md) | Skenario demo kompetisi |
| [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) | Panduan deployment ke VPS |

---

<p align="center">
  <strong>PRISMA AI</strong> — Predictive & Real-time Industrial Smart Monitoring with AI<br>
  <em>Dibuat untuk kompetisi inovasi industri proses kimia</em>
</p>
