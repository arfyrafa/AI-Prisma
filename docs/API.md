# Referensi API

Base URL: `http://localhost:8000/api` · Dokumentasi interaktif: `http://localhost:8000/docs`

## Sistem

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/health` | Status database, provider agent, model prediktif, mode simulasi |

## Proses

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/processes` | Daftar proses |
| GET | `/processes/{id}` | Detail satu proses |
| GET | `/processes/{id}/latest` | Snapshot terkini: pembacaan + status tiap parameter + jumlah alert aktif |
| GET | `/processes/{id}/parameters` | Rentang operasi terkonfigurasi |
| PATCH | `/processes/{id}/parameters/{parameter_id}` | Ubah target/min/maks (tercatat di audit) |
| GET | `/processes/{id}/history?range=1h\|6h\|24h\|7d&parameters=a,b` | Riwayat time-series |
| GET | `/processes/{id}/deviations` | Penyimpangan pada pembacaan terakhir |

## Alert

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/alerts?process_id=&status=&severity=&parameter_name=&hours=&limit=` | Daftar alert |
| GET | `/alerts/{id}` | Detail alert |
| PATCH | `/alerts/{id}/acknowledge` | Akui alert (`acknowledged_by`, `notes`) |

Severity: `INFO`, `WARNING`, `CRITICAL`. Status: `active`, `acknowledged`, `resolved`.

## Prediksi

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/predictions?process_id=&target_parameter=&limit=` | Riwayat prediksi |
| GET | `/predictions/latest?process_id=&target_parameter=` | Prediksi terbaru |
| POST | `/predictions/generate` | Jalankan model; `409` bila riwayat belum cukup |

## AI

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/insights?process_id=&limit=` | Riwayat insight |
| POST | `/insights/analyze` | Minta analisis; `503` bila agent tidak tersedia |
| GET | `/recommendations?process_id=&status=&limit=` | Daftar rekomendasi |
| POST | `/recommendations/{id}/verify` | Simpan keputusan engineer (`accept`/`reject`/`needs_analysis`) |
| POST | `/agent/chat` | Tanya jawab dengan agent; `503` bila agent tidak tersedia |

## Knowledge base & audit

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/knowledge-base?q=&doc_type=` | Cari dokumen |
| GET | `/knowledge-base/{id}` | Isi dokumen |
| GET | `/audit-logs?action=&entity_type=&limit=` | Jejak audit |

## Ingesti sensor

`POST /api/ingestion/sensor`

```json
{
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
}
```

Respons berisi pembacaan tersimpan, daftar penyimpangan, dan alert yang baru dibuat. Kunci
`co2_concentration` diterima sebagai alias `clo2_concentration`.

## WebSocket

`ws://localhost:8000/ws` (lewat frontend: `ws://localhost:8080/ws`)

```json
{ "event": "reading", "payload": { "reading": {...}, "deviations": [...], "alerts": [...], "phase": "drift" } }
{ "event": "alert",   "payload": { "id": 12, "severity": "WARNING", ... } }
```

Bila socket tidak tersedia, dashboard otomatis beralih ke polling 5 detik dan mencoba
menyambung ulang tiap 4 detik.

## Kontrak AI Agent eksternal

Backend memanggil agent dengan konteks berikut:

```json
{
  "context": {
    "process_id": 1,
    "process_name": "Proses Produksi ClO₂",
    "timestamp": "2026-08-16T15:20:00Z",
    "parameters": [
      {
        "parameter_name": "clo2_concentration",
        "display_name": "Konsentrasi ClO₂",
        "unit": "mg/L",
        "current_value": 9.5,
        "target_value": 8.5,
        "minimum_value": 5.0,
        "maximum_value": 9.0,
        "deviation": 1.0,
        "status": "warning"
      }
    ],
    "deviations": [ { "parameter_name": "clo2_concentration", "severity": "WARNING", "message": "..." } ],
    "recent_trend": { "clo2_concentration": [8.4, 8.7, 9.1, 9.5] },
    "knowledge_refs": [ { "id": 1, "title": "SOP Pengendalian Konsentrasi ClO₂", "reference_code": "SOP-CLO2-01" } ]
  }
}
```

Bentuk respons yang diharapkan:

```json
{
  "insight": {
    "summary": "ringkasan satu kalimat",
    "details": "penjelasan lengkap",
    "related_parameters": ["clo2_concentration", "ph"],
    "confidence": 0.82
  },
  "recommendations": [
    {
      "recommendation": "Tinjau dosis SO₂ dan kontrol pH.",
      "reason": "alasan berbasis data",
      "suggested_action": "langkah konkret",
      "related_parameters": ["so2_dosage", "ph"]
    }
  ]
}
```

`confidence` bersifat opsional. Bila agent tidak mengirimkannya, dashboard tidak menampilkan
angka keyakinan apa pun.
