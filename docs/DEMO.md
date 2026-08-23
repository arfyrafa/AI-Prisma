# Skenario Demo Kompetisi (± 5 menit)

Tujuan: menunjukkan satu alur utuh dari data mentah sampai keputusan engineer, tanpa perlu
sensor industri sungguhan.

## Persiapan (sebelum juri masuk)

```bash
docker compose up --build -d
```

Tunggu ± 1 menit, buka http://localhost:8080, pastikan:

- Banner **SIMULATION MODE** terlihat di header (kejujuran data disampaikan sejak awal).
- Indikator "Sistem online" hijau dan mode "Real-time (WebSocket)".
- Kartu KPI sudah berisi angka dan grafik sudah memiliki riwayat.

Simulator berputar melalui empat fase (± 6–7 menit per siklus penuh):

```
normal (2 mnt) → drift (1,5 mnt) → deviation (1 mnt) → recovery (2 mnt)
```

Jika ingin penyimpangan muncul lebih cepat saat latihan, percepat simulator lewat `.env`:
`SIMULATION_INTERVAL_SECONDS=2`.

## Alur presentasi

### 1. Kondisi normal (30 detik) — halaman Dashboard

Tunjukkan: status proses "Normal", kartu KPI ClO₂ ± 8,4 mg/L, pH 4,5, laju alir 28,0 m³/jam,
tekanan 9,5 bar. Tekankan bahwa angka berubah sendiri setiap 5 detik lewat WebSocket, bukan
halaman yang di-refresh.

Poin bicara: *"Pipeline strip di bawah header memperlihatkan rantai keputusan PRISMA AI. Rantai
ini berakhir di engineer, bukan di peralatan."*

### 2. Penyimpangan muncul (60 detik)

Saat fase drift berjalan, pH turun, dosis SO₂ naik, konsentrasi ClO₂ merangkak naik melewati
batas atas 9,0 mg/L. Yang terjadi otomatis:

- Kartu KPI ClO₂ berubah menjadi **Peringatan**, lalu **Kritis** bila melewati 9,5 mg/L.
- Panel "Penyimpangan aktif" di bagian atas dashboard terisi — juri tidak perlu mencari.
- Alert tercatat di Alert Center beserta nilai aktual, batas, dan selisihnya.

Poin bicara: *"Ambang ini bukan hard-code di tampilan. Semua berasal dari rentang operasi di
database, yang bisa diubah engineer di halaman Pengaturan."*

Bila perlu, buka **Pengaturan** dan tunjukkan rentang operasi yang menjadi sumber kebenaran.

### 3. Prediksi (45 detik) — halaman Prediksi

Klik **Jalankan prediksi**. Tampil nilai aktual, nilai prediksi, target, grafik aktual (garis
solid) vs prediksi (garis putus-putus ungu), serta metadata model: nama model, R², MAE, jumlah
data latih, dan koefisien regresi tiap parameter.

Poin bicara: *"Model regresi linear berganda dilatih dari riwayat proses. Modelnya komponen
terpisah — bisa diganti tim modeling tanpa menyentuh dashboard."*

### 4. Analisis dan insight AI (60 detik) — kembali ke Dashboard

Klik **Jalankan analisis AI**. Insight menjelaskan kondisi ClO₂ saat ini beserta faktor yang
berpotensi berkontribusi (dosis SO₂ di atas target, pH di bawah target, tren naik) dan referensi
dokumen SOP terkait.

Poin bicara: *"Insight ini disusun dari data proses nyata di database — parameter, rentang
operasi, tren, dan Knowledge Base. Agent tidak melaporkan skor keyakinan, jadi dashboard tidak
menampilkannya. Kami tidak mengarang angka."*

### 5. Rekomendasi dan verifikasi engineer (60 detik)

Panel rekomendasi menampilkan tindakan yang disarankan beserta alasannya, ditutup peringatan
bahwa verifikasi engineer diperlukan.

Klik **Verifikasi rekomendasi** → centang "sudah meninjau" → pilih **Terima** → isi catatan →
**Simpan verifikasi**. Status berubah menjadi "Diterima engineer".

Poin bicara: *"Ini inti positioning kami. Sistem berhenti di sini. Tidak ada perintah yang
dikirim ke peralatan. AI membantu engineer, bukan menggantikan engineer."*

### 6. Jejak audit (30 detik) — halaman Audit Trail

Tunjukkan urutan lengkap yang baru saja terjadi: alert dibuat → analisis AI diminta → insight
dihasilkan → rekomendasi dihasilkan → verifikasi engineer, semuanya dengan cap waktu.

Poin bicara: *"Setiap langkah dapat ditelusuri — syarat wajib di lingkungan industri teregulasi."*

## Cadangan bila ada masalah

| Masalah | Yang dilakukan |
| --- | --- |
| Penyimpangan belum muncul saat dibutuhkan | Buka Alert Center dan tunjukkan alert dari siklus sebelumnya, atau kirim pembacaan manual lewat perintah curl di README bagian 5 |
| Angka tidak bergerak | Cek indikator mode di header; bila "Polling" dashboard tetap berjalan, cukup jelaskan fallback-nya |
| AI Agent tidak tersedia | Justru tunjukkan sebagai fitur: pemantauan dan alert tetap berjalan, dashboard menyatakan agent tidak tersedia alih-alih mengarang jawaban |
| Container gagal start | `docker compose down -v && docker compose up --build` |

## Pertanyaan juri yang mungkin muncul

**"Apakah ini mengendalikan pabrik?"**
Tidak. Tidak ada endpoint tulis ke peralatan. Rekomendasi bersifat advisory dan berhenti di
verifikasi engineer.

**"Datanya asli?"**
Tidak, dan dashboard menyatakannya sendiri lewat banner SIMULATION MODE. Setiap pembacaan
disimpan dengan `source="simulation"`. Untuk data nyata, matikan simulator dan kirim ke
`POST /api/ingestion/sensor`.

**"Bagaimana kalau AI Agent-nya dari tim lain?"**
Sudah disiapkan: agent berada di balik antarmuka abstrak dengan tiga endpoint kontrak. Ganti
`AGENT_PROVIDER=openclaw` di `.env`, tanpa mengubah satu baris pun di frontend.
