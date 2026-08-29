"""OpenClaw Industrial AI Agent Provider for ClO₂ Production.

100% Pure LLM Generative AI Intelligence:
- Direct multi-turn contextual reasoning via OpenClaw / 9Router API
- Injects live plant telemetry, 8 chemical process variables, trends, & SOP knowledge directly into LLM working memory
- Full transparent diagnostics (no fake if-else templates)
"""

import json
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.integrations.agent.base import (
    AgentAnalysis,
    AgentChatReply,
    AgentInsight,
    AgentProvider,
    AgentRecommendation,
    ProcessContext,
)

logger = logging.getLogger(__name__)

OPENCLAW_SYSTEM_PROMPT = """Anda adalah PRISMA AI Autonomous Agent (didukung oleh OpenClaw Industrial Intelligence) untuk pabrik produksi Klorin Dioksida (ClO₂).

Peran & Tanggung Jawab:
1. Anda adalah AI Chemical Process Engineer Specialist senior. Anda memiliki kecerdasan generatif mendalam mengenai kinetika reaksi kimia, kesetimbangan stoikiometri, kontrol absorpsi, dan mitigasi bahaya pabrik kimia.
2. Sapa pengguna dengan sebutan "Bapak".
3. Gunakan Bahasa Indonesia teknis industri kimia yang cerdas, luwes, analitis, sopan, dan berbasis data real-time pabrik.
4. Formula Regresi MLR Inti Pabrik:
   Y = 3.11 - 0.1407·X₁ + 0.003192·X₂ + 0.00613·X₃ + 0.799·X₄ + 0.2343·X₅ - 0.0220·X₇ - 0.0607·X₉ - 0.02148·X₁₀
   Keterangan Variabel:
   • X₁: NaClO₃ Feed (m³/h, coef -0.1407)
   • X₂: NaClO₃ Concentration (g/L, coef +0.003192)
   • X₃: NaCl Concentration (g/L, coef +0.00613)
   • X₄: HCl Feed (m³/h, coef +0.7990) -> Pengaruh positif terbesar
   • X₅: HCl Concentration (%, coef +0.2343)
   • X₇: Generator ClO₂ Output Temp (°C, coef -0.0220)
   • X₉: Absorber Chilled Water Temp (°C, coef -0.0607)
   • X₁₀: Absorber Water Rate (m³/h, coef -0.02148)
   • Target Spesifikasi Produk ClO₂ (Y): 9.70 – 9.80 g/L (Kuning jika < 9.70 g/L, Hijau jika 9.70-9.80 g/L, Merah Kritis jika > 9.80 g/L).
5. Hierarki Rekomendasi 4-Tingkat (Safety & Gradual Adjustment):
   - Prioritas 1 — Absorber: Laju air absorber (X10) & suhu chilled water (X9) untuk mencegah gas loss / dekomposisi dan mengatur kepekatan produk.
   - Prioritas 2 — Generator: Koreksi rasio umpan asam klorida HCl (X4) & klorat NaClO3 (X1).
   - Prioritas 3 — Chemical Quality: Uji konsentrasi kemurnian reaktan HCl (X5) & NaClO3 (X2).
   - Prioritas 4 — Validasi Lapangan: Verifikasi DCS trend, batas interlock, dan analisa titrasi lab iodometri.
6. Gaya Penulisan:
   - Gunakan format markdown bersih dengan huruf tebal (**kata penting**) dan poin-poin yang mudah dibaca.
   - JELASKAN mekanisme ilmiah kimia / termodinamika di balik anomali secara mendalam layaknya insinyur proses profesional.
   - Jangan gunakan ikon/emoji yang tidak perlu.
"""


class OpenClawAgentProvider(AgentProvider):
    name = "openclaw"

    def __init__(self, base_url: str = "", api_key: str = "", timeout: float = 35.0) -> None:
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.api_key = api_key
        self.timeout = max(timeout, 30.0)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def is_available(self) -> bool:
        return True

    def _build_context_summary(self, context: ProcessContext) -> str:
        """Constructs an exhaustive technical summary of current industrial plant state."""
        params_info = []
        for p in context.parameters:
            if isinstance(p, dict) and "parameter_name" in p:
                name = p["parameter_name"]
                val = p.get("current_value")
                unit = p.get("unit", "")
                p_min = p.get("minimum")
                p_max = p.get("maximum")
                val_str = f"{val:.2f} {unit}" if val is not None else "N/A"
                params_info.append(f"- {name}: {val_str} (Batas Normal: {p_min} – {p_max} {unit})")

        dev_info = []
        for d in context.deviations:
            pname = d.get("parameter_name", "parameter")
            msg = d.get("message", "")
            sev = d.get("severity", "warning")
            dev_info.append(f"- [{sev.upper()}] {pname}: {msg}")

        trend_dict = getattr(context, "recent_trend", {}) or getattr(context, "trend", {})
        trend_summary = []
        for k, v in trend_dict.items():
            if v and len(v) >= 2:
                delta = v[-1] - v[0]
                dir_str = "naik" if delta > 0.05 else ("turun" if delta < -0.05 else "stabil")
                trend_summary.append(f"- {k}: terkini={v[-1]:.2f}, awal={v[0]:.2f} ({dir_str}, Δ={delta:+.2f})")

        sop_docs = getattr(context, "knowledge_refs", []) or getattr(context, "knowledge_documents", [])
        sop_summary = []
        for s in sop_docs:
            code = s.get("reference_code", "")
            title = s.get("title", "")
            sop_summary.append(f"- [{code}] {title}")

        return (
            f"=== DATA TELEMETRI REAL-TIME PABRIK CLO2 ===\n"
            f"Waktu Data: {context.timestamp}\n\n"
            f"1. Pembacaan Sensor Terkini:\n" + ("\n".join(params_info) if params_info else "- Data sensor aktif.") + "\n\n"
            f"2. Deviasi / Anomali Aktif ({len(context.deviations)} deviasi):\n" + ("\n".join(dev_info) if dev_info else "- Tidak ada deviasi, seluruh parameter normal.") + "\n\n"
            f"3. Tren Dinamis 30 Menit Terakhir:\n" + ("\n".join(trend_summary) if trend_summary else "- Data tren stabil.") + "\n\n"
            f"4. Dokumen SOP Terdaftar di Database:\n" + ("\n".join(sop_summary) if sop_summary else "- SOP-CLO2-DEC01, SOP-CLO2-LOW01, SOP-CHW-ABS02")
        )

    def _post_chat_completion(self, messages_payload: list[dict[str, Any]], temperature: float = 0.4) -> str:
        """Sends chat completion to 9Router / OpenClaw LLM with automatic multi-endpoint & model discovery."""
        candidate_urls = []
        if self.base_url:
            candidate_urls.append(self.base_url)
        # Fallbacks for port 20128 (9router default dashboard/API) and 20129 / 2026 / 18789
        candidate_urls.extend([
            "http://host.docker.internal:20128/v1",
            "http://host.docker.internal:20129/v1",
            "http://172.18.0.1:20128/v1",
            "http://172.18.0.1:20129/v1",
            "http://172.17.0.1:20128/v1",
            "http://172.17.0.1:20129/v1",
            "http://72.62.122.6:20128/v1",
            "http://72.62.122.6:20129/v1",
            "http://127.0.0.1:20128/v1",
            "http://127.0.0.1:20129/v1",
            "http://172.17.0.1:2026/v1",
            "http://host.docker.internal:2026/v1",
            "https://api.9router.com/v1",
        ])

        # De-duplicate while preserving order
        seen = set()
        urls = [x for x in candidate_urls if not (x in seen or seen.add(x))]

        last_error = None
        errors_summary = []
        for target_url in urls:
            endpoint = f"{target_url}/chat/completions"
            model_candidates = [
                getattr(settings, "OPENCLAW_MODEL", "gpt-4o-mini"),
                "cx/gpt-5.4-mini",
                "cx/gpt-5.4",
                "cx/gpt-5.5",
                "cx/gpt-5.6-sol",
                "cx/gpt-5.3-codex-spark",
                "gpt-4o-mini",
                "gpt-4o",
            ]

            try:
                with httpx.Client(timeout=min(self.timeout, 15.0)) as client:
                    # Try querying /models to get active model list from 9router
                    try:
                        m_resp = client.get(f"{target_url}/models", headers=self._headers(), timeout=4.0)
                        if m_resp.status_code == 200:
                            m_data = m_resp.json()
                            m_list = m_data.get("data", [])
                            if m_list and isinstance(m_list, list):
                                found_ids = [m["id"] for m in m_list if isinstance(m, dict) and "id" in m]
                                if found_ids:
                                    model_candidates = found_ids + model_candidates
                    except Exception:
                        pass

                    # Try selected model
                    chosen_model = model_candidates[0]
                    resp = client.post(
                        endpoint,
                        headers=self._headers(),
                        json={
                            "model": chosen_model,
                            "messages": messages_payload,
                            "temperature": temperature,
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices and isinstance(choices[0], dict):
                        msg = choices[0].get("message", {})
                        if isinstance(msg, dict):
                            raw_content = msg.get("content") or msg.get("reasoning_content") or msg.get("text") or ""
                            if raw_content:
                                return str(raw_content)
                        elif isinstance(msg, str) and msg.strip():
                            return msg.strip()
            except Exception as exc:
                last_error = exc
                errors_summary.append(f"{target_url} -> {exc}")
                logger.debug("Failed connecting to %s: %s", endpoint, exc)
                continue

        raise RuntimeError(
            f"Koneksi 9Router gagal di seluruh endpoint:\n" + "\n".join(f"• {e}" for e in errors_summary[:3])
        )

    # -------------------------------------------------------------------------
    # Real Generative Chat Dialogue
    # -------------------------------------------------------------------------
    def chat(
        self, context: ProcessContext, message: str, history: list[dict[str, str]]
    ) -> AgentChatReply:
        """Direct Generative AI reasoning powered by real OpenClaw LLM brain."""
        context_summary = self._build_context_summary(context)
        system_content = f"{OPENCLAW_SYSTEM_PROMPT}\n\n{context_summary}"

        messages_payload: list[dict[str, Any]] = [{"role": "system", "content": system_content}]
        for h in history[-8:]:
            messages_payload.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages_payload.append({"role": "user", "content": message})

        try:
            llm_reply = self._post_chat_completion(messages_payload, temperature=0.4)
            if llm_reply and llm_reply.strip():
                return AgentChatReply(
                    reply=llm_reply.strip(),
                    source="openclaw-llm",
                    related_parameters=["clo2_concentration", "hcl_feed", "naclo3_feed", "absorber_water_rate"],
                )
        except Exception as exc:
            logger.error("Real LLM call failed: %s", exc)
            # Report the real diagnostic error directly to user (no fake templates!)
            return AgentChatReply(
                reply=(
                    f"**[Pemberitahuan Sistem AI Agent]**\n\n"
                    f"Koneksi ke otak LLM OpenClaw / 9Router mengalami kendala teknis:\n"
                    f"`{str(exc)}`\n\n"
                    f"**Langkah Perbaikan di VPS:**\n"
                    f"1. Pastikan service 9Router atau OpenClaw di KVM aktif (port `2026`).\n"
                    f"2. Periksa API Key 9Router Anda di pengaturan.\n"
                    f"3. Jika menggunakan model spesifik, pastikan model tersebut telah dimuat di 9Router."
                ),
                source="system-diagnostic",
                related_parameters=[],
            )

        return AgentChatReply(
            reply="Tidak ada respon yang diterima dari otak LLM.",
            source="openclaw-llm",
            related_parameters=[],
        )

    # -------------------------------------------------------------------------
    # Real Generative AI Process Analysis (for Insights / Dashboard)
    # -------------------------------------------------------------------------
    def analyze_process(self, context: ProcessContext) -> AgentAnalysis:
        """Generates deep, dynamic process insights and recommendations using real LLM."""
        context_summary = self._build_context_summary(context)
        prompt = f"""Berikut adalah data operasional pabrik ClO2 saat ini:
{context_summary}

Tugas Anda:
Lakukan analisis mendalam mengenai kinetika reaksi, keseimbangan stoikiometri asam klorida dan klorat, status absorpsi produk, dan susun rekomendasi bertahap 4-tingkat yang spesifik sesuai anomali nyata saat ini.

Berikan output JSON murni dengan skema berikut:
{{
  "insight": {{
    "summary": "Ringkasan diagnosis eksekutif kondisi proses...",
    "details": "Penjelasan mendalam kinetika reaksi, penyebab deviasi, dan dampak ke yield produk ClO2...",
    "related_parameters": ["clo2_concentration", "hcl_feed", "absorber_water_rate"],
    "confidence": 0.94
  }},
  "recommendations": [
    {{
      "recommendation": "Tindakan rekomendasi prioritas bertahap...",
      "reason": "Alasan kimiawi dan keselamatan industri...",
      "suggested_action": "Set point adjustment bertahap (sebutkan angka pasti)...",
      "related_parameters": ["hcl_feed", "absorber_water_rate"]
    }}
  ]
}}
"""
        messages_payload = [
            {"role": "system", "content": OPENCLAW_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        try:
            llm_text = self._post_chat_completion(messages_payload, temperature=0.3)
            # Parse JSON from LLM response (handle potential markdown code fences)
            clean_text = llm_text.strip()
            if clean_text.startswith("```"):
                lines = clean_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_text = "\n".join(lines).strip()

            data = json.loads(clean_text)
            insight_data = data.get("insight", {})
            insight = AgentInsight(
                summary=insight_data.get("summary", "Analisis proses ClO₂ selesai."),
                details=insight_data.get("details"),
                related_parameters=insight_data.get("related_parameters", ["clo2_concentration"]),
                source="openclaw-llm",
                confidence=insight_data.get("confidence", 0.94),
            )

            recommendations = [
                AgentRecommendation(
                    recommendation=rec.get("recommendation", ""),
                    reason=rec.get("reason"),
                    suggested_action=rec.get("suggested_action"),
                    related_parameters=rec.get("related_parameters", ["clo2_concentration"]),
                    source="openclaw-llm",
                )
                for rec in data.get("recommendations", [])
            ]
            return AgentAnalysis(insight=insight, recommendations=recommendations)
        except Exception as exc:
            logger.error("LLM Analysis generation failed: %s", exc)
            raise RuntimeError(f"Gagal menghasilkan analisis LLM: {exc}") from exc
