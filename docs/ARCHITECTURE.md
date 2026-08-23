# Catatan Arsitektur

Dokumen ini merekam keputusan desain yang diambil beserta alasannya, agar tim berikutnya tidak
perlu menebak.

## Prinsip yang dipegang

**1. Status dihitung di backend, bukan di UI.**
Kartu KPI, tabel parameter, dan panel penyimpangan hanya menampilkan `status` yang dikirim API.
Sumbernya satu: tabel `process_parameters`. Mengubah rentang operasi di halaman Pengaturan
langsung mengubah alert, warna kartu, dan hasil analisis AI — tanpa deploy ulang.

**2. Frontend tidak pernah menyentuh database maupun agent.**
Semua lalu lintas lewat FastAPI. Ini membuat integrasi OpenClaw menjadi urusan backend saja.

**3. Komponen eksternal berada di balik antarmuka abstrak.**
`AgentProvider` (base → mock/openclaw) dan `PredictiveModel` (base → regression/mock) dipilih di
`integrations/factory.py` berdasarkan environment variable. Menambah provider baru berarti
menambah satu file, bukan mengubah rute atau komponen React.

**4. Sistem tidak boleh mengarang.**
- Confidence hanya tampil bila agent melaporkannya.
- Agent mati → `503` dan status "tidak tersedia", bukan jawaban tiruan.
- Riwayat belum cukup untuk melatih model → `409`, bukan angka asal.
- Data simulasi selalu berlabel, di banner header maupun di kolom `source`.

**5. Rantai keputusan berhenti di engineer.**
Tidak ada endpoint yang menulis ke peralatan. Rekomendasi AI dan keputusan engineer disimpan di
tabel terpisah (`recommendations` vs `engineer_verifications`) sehingga keduanya tidak pernah
tertukar dalam audit.

## Keputusan teknis yang perlu diketahui

**Nama kolom `clo2_concentration`.**
PRD menuliskan `co2_concentration`, tetapi prosesnya klorin dioksida. Kolom dinamai
`clo2_concentration` agar tidak menyesatkan; endpoint ingesti tetap menerima kunci lama sebagai
alias sehingga publisher lama tidak perlu diubah.

**Ambang severity.**
Nilai di luar `[minimum, maximum]` = `WARNING`. Naik ke `CRITICAL` bila melewati batas lebih dari
`CRITICAL_MARGIN_RATIO` (default 0,125) dikali lebar rentang. Untuk ClO₂ (5,0–9,0) ini berarti
peringatan pada 9,0–9,5 dan kritis di atas 9,5 — persis contoh di PRD, tanpa menuliskan angka
industri apa pun secara hard-code.

**Skema dibuat dari metadata SQLAlchemy, bukan Alembic.**
Pilihan sadar agar demo cukup satu perintah. `backend/migrations/README.md` berisi langkah
pindah ke Alembic saat skema mulai berubah di lingkungan yang menyimpan data nyata.

**Session SQLAlchemy sinkron.**
Endpoint ditulis sebagai fungsi biasa sehingga FastAPI menjalankannya di threadpool. Jalur async
(simulator dan ingesti) memakai `asyncio.to_thread` untuk akses database. Lebih sederhana dan
lebih sulit salah dibanding mencampur async ORM pada MVP.

**WebSocket adalah optimasi, bukan syarat.**
`useLiveProcess` mencoba socket, dan bila gagal beralih ke polling 5 detik sambil menyambung
ulang di latar belakang. Header menampilkan mode yang sedang aktif. Demo tidak akan mati hanya
karena proxy memutus koneksi.

**Nginx mem-proxy `/api` dan `/ws`.**
Frontend dan backend tampil satu origin, sehingga tidak ada kejutan CORS di laptop demo.

**Tanpa Redis, Kafka, atau microservice.**
Belum ada kebutuhan konkret. Menambahkannya hanya akan memperbesar peluang gagal saat demo.

## Batas MVP yang disengaja

- Autentikasi belum aktif. Setiap penulisan sudah membawa identitas aktor (`CurrentUser` di
  `api/deps.py`), jadi peran Super Admin / Engineer / Viewer bisa ditambahkan di satu tempat.
- Knowledge Base memakai pencarian teks sederhana. Layanannya sudah terpisah
  (`services/knowledge.py`) agar bisa diganti indeks RAG tanpa mengubah kontrak API.
- Unggah dokumen belum tersedia; dokumen di-seed saat inisialisasi.
- Belum ada test otomatis. Kandidat pertama: mesin deviasi (`services/deviation.py`) dan
  rekonsiliasi alert (`services/alerts.py`) — keduanya logika murni yang mudah diuji.

## Urutan pengembangan lanjutan yang disarankan

1. Sambungkan OpenClaw sungguhan, verifikasi bentuk respons terhadap `docs/API.md`.
2. Ganti model regresi dengan model yang dilatih dari data historian sungguhan.
3. Aktifkan autentikasi dan peran.
4. Pindah ke Alembic sebelum ada data nyata yang perlu dipertahankan.
5. Tambahkan test untuk mesin deviasi dan siklus alert.
