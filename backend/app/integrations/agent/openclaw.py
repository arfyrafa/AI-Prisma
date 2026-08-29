"""OpenClaw Industrial AI Agent Provider for ClO₂ Production.

Full Autonomous AI Agent implementation featuring:
- Tool Calling & Function Calling (ReAct Loop)
- Real-time Telemetry Inspection & Trend Velocity Analysis
- Live MLR Equation Computation & Sensitivity Diagnosis
- Semantic SOP & Industrial Safety Knowledge Retrieval
- Generative Process Kinetics Reasoning & Decision Support
"""

import json
import logging
import math
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

# OpenClaw ClO2 MLR Equation:
# Y = 3.11 - 0.1407*X1 + 0.003192*X2 + 0.00613*X3 + 0.799*X4 + 0.2343*X5 - 0.0220*X7 - 0.0607*X9 - 0.02148*X10
MLR_COEFFICIENTS = {
    "intercept": 3.11,
    "X1": -0.1407,  # NaClO3 Feed (m3/h)
    "X2": 0.003192,  # NaClO3 Concentration (g/L)
    "X3": 0.00613,  # NaCl Concentration (g/L)
    "X4": 0.799,  # HCl Feed (m3/h)
    "X5": 0.2343,  # HCl Concentration (%)
    "X7": -0.0220,  # Generator ClO2 Output Temp (°C)
    "X9": -0.0607,  # Absorber Chilled Water Temp (°C)
    "X10": -0.02148,  # Absorber Water Rate (m3/h)
}

OPENCLAW_SYSTEM_PROMPT = """Anda adalah PRISMA AI Autonomous Agent (OpenClaw Industrial Intelligence) untuk pabrik produksi Klorin Dioksida (ClO₂).

Peran & Tanggung Jawab:
1. Anda adalah AI Process Engineer Specialist tingkat lanjut yang membantu operator & lead engineer memantau, mendiagnosis, memprediksi, dan mengoptimalkan unit generator & absorber ClO₂.
2. Anda memiliki akses ke alat bantu (Tools / Function Calling) untuk memeriksa telemetri terkini, menghitung tren laju perubahan parameter, menjalankan simulasi model regresi linier berganda (MLR), dan mencari SOP keselamatan.
3. Selalu utamakan integritas keselamatan pabrik, kinetika reaksi kimia yang presisi, dan hierarki rekomendasi 4-tingkat:
   - Prioritas 1 — Absorber: Laju alir air penyerap (X10) & Suhu chilled water (X9) untuk mencegah emisi gas dan mengendalikan konsentrasi produk akhir.
   - Prioritas 2 — Generator: Penyesuaian rasio stoikiometri umpan HCl Feed (X4) & NaClO3 Feed (X1).
   - Prioritas 3 — Chemical Quality: Verifikasi mutu bahan baku konsentrasi HCl (X5) & NaClO3 (X2).
   - Prioritas 4 — Validasi Lapangan: Verifikasi DCS trend, batas interlock, dan analisa titrasi laboratorium.
4. Karakteristik Komunikasi:
   - Sapa pengguna dengan "Bapak".
   - Gunakan Bahasa Indonesia teknis industri kimia yang lugas, terstruktur, berbasis data, dan solutif.
   - JELASKAN mekanisme kimia / kinetika di balik anomali (misal: pengaruh temperatur terhadap dekomposisi gas ClO₂ atau pengaruh rasio asam klorida).
   - Gunakan format markdown bersih: gunakan tanda bintang dobel (contoh: **teks tebal**) untuk parameter dan angka penting, serta bullet points yang rapi. Jangan gunakan ikon atau emoji yang tidak formal.
   - Sistem ini adalah Decision Support: setiap penyesuaian lapangan bersifat rekomendasi bertahap dan memerlukan persetujuan engineer.
"""

AGENT_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_live_telemetry",
            "description": "Mengambil data telemetri terkini untuk seluruh 8 variabel proses kimia (X1 sampai X10), konsentrasi produk ClO2 (Y, g/L), status deviasi, dan batasan operasional aman.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_parameter_history_and_trend",
            "description": "Mengambil data historis dan menganalisis statistik tren (nilai rata-rata, minimum, maksimum, delta perubahan, dan arah laju naik/turun) untuk parameter tertentu dari time-series sensor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "parameter_name": {
                        "type": "string",
                        "description": "Nama kode parameter, contoh: clo2_concentration, naclo3_feed, hcl_feed, generator_temperature, absorber_water_temperature, absorber_water_rate",
                    }
                },
                "required": ["parameter_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_mlr_prediction",
            "description": "Menghitung estimasi konsentrasi produk ClO2 (Y, g/L) secara matematis menggunakan model Multiple Linear Regression (MLR) resmi pabrik berdasarkan nilai 8 variabel proses.",
            "parameters": {
                "type": "object",
                "properties": {
                    "x1_naclo3_feed": {"type": "number", "description": "Laju alir NaClO3 feed (m3/h)"},
                    "x2_naclo3_conc": {"type": "number", "description": "Konsentrasi larutan NaClO3 (g/L)"},
                    "x3_nacl_conc": {"type": "number", "description": "Konsentrasi NaCl (g/L)"},
                    "x4_hcl_feed": {"type": "number", "description": "Laju alir HCl feed (m3/h)"},
                    "x5_hcl_conc": {"type": "number", "description": "Konsentrasi larutan HCl (%)"},
                    "x7_gen_temp": {"type": "number", "description": "Suhu gas ClO2 generator (°C)"},
                    "x9_abs_temp": {"type": "number", "description": "Suhu air pendingin absorber / chilled water (°C)"},
                    "x10_abs_rate": {"type": "number", "description": "Laju alir air pendingin absorber (m3/h)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_sop_and_safety_rules",
            "description": "Mencari Standard Operating Procedure (SOP), panduan mitigasi bahaya dekomposisi gas ClO2, dan instruksi penanganan deviasi operasional dari Knowledge Base.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Kata kunci pencarian, contoh: 'dekomposisi gas', 'suhu generator tinggi', 'konsentrasi rendah', 'chilled water absorber'",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "diagnose_process_deviations",
            "description": "Menganalisis deviasi parameter aktif, mendiagnosis akar penyebab ketidakseimbangan stoikiometri, dan menghitung peringkat sensitivitas variabel terhadap produk ClO2.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
]


class OpenClawAgentProvider(AgentProvider):
    name = "openclaw"

    def __init__(self, base_url: str = "", api_key: str = "", timeout: float = 25.0) -> None:
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.api_key = api_key
        self.timeout = max(timeout, 20.0)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def is_available(self) -> bool:
        return True

    def get_tools_schema(self) -> list[dict[str, Any]]:
        return AGENT_TOOLS_SCHEMA

    # -------------------------------------------------------------------------
    # Tool Implementations (Real Data Execution)
    # -------------------------------------------------------------------------
    def _exec_get_live_telemetry(self, context: ProcessContext) -> dict[str, Any]:
        params_dict = {}
        for p in context.parameters:
            if isinstance(p, dict) and "parameter_name" in p:
                name = p["parameter_name"]
                val = p.get("current_value")
                params_dict[name] = {
                    "value": round(val, 2) if val is not None else None,
                    "unit": p.get("unit", ""),
                    "min": p.get("minimum"),
                    "max": p.get("maximum"),
                    "status": "normal",
                }

        # Check deviations
        for dev in context.deviations:
            pname = dev.get("parameter_name")
            if pname in params_dict:
                params_dict[pname]["status"] = dev.get("severity", "warning")
                params_dict[pname]["deviation_message"] = dev.get("message", "")

        return {
            "process_name": context.process_name,
            "timestamp": str(context.timestamp),
            "telemetry": params_dict,
            "total_deviations": len(context.deviations),
        }

    def _exec_get_parameter_history(self, context: ProcessContext, parameter_name: str) -> dict[str, Any]:
        trend_dict = getattr(context, "recent_trend", {}) or getattr(context, "trend", {})
        series = trend_dict.get(parameter_name, [])
        if not series:
            # Check for alternative naming
            for key in trend_dict:
                if parameter_name in key or key in parameter_name:
                    series = trend_dict[key]
                    parameter_name = key
                    break

        if not series:
            return {"parameter": parameter_name, "error": "Data riwayat time-series tidak ditemukan."}

        avg_val = sum(series) / len(series)
        min_val = min(series)
        max_val = max(series)
        delta = series[-1] - series[0]
        direction = "stabil"
        if abs(delta) > 0.05:
            direction = "meningkat" if delta > 0 else "menurun"

        return {
            "parameter": parameter_name,
            "data_points_count": len(series),
            "current_value": round(series[-1], 3),
            "start_value": round(series[0], 3),
            "average": round(avg_val, 3),
            "minimum": round(min_val, 3),
            "maximum": round(max_val, 3),
            "delta_change": round(delta, 3),
            "trend_direction": direction,
            "recent_series_tail": [round(x, 2) for x in series[-6:]],
        }

    def _exec_calculate_mlr(self, args: dict[str, Any]) -> dict[str, Any]:
        intercept = MLR_COEFFICIENTS["intercept"]
        x1 = float(args.get("x1_naclo3_feed") or 28.0)
        x2 = float(args.get("x2_naclo3_conc") or 435.0)
        x3 = float(args.get("x3_nacl_conc") or 95.0)
        x4 = float(args.get("x4_hcl_feed") or 4.10)
        x5 = float(args.get("x5_hcl_conc") or 31.5)
        x7 = float(args.get("x7_gen_temp") or 46.5)
        x9 = float(args.get("x9_abs_temp") or 8.5)
        x10 = float(args.get("x10_abs_rate") or 104.5)

        y_pred = (
            intercept
            + (MLR_COEFFICIENTS["X1"] * x1)
            + (MLR_COEFFICIENTS["X2"] * x2)
            + (MLR_COEFFICIENTS["X3"] * x3)
            + (MLR_COEFFICIENTS["X4"] * x4)
            + (MLR_COEFFICIENTS["X5"] * x5)
            + (MLR_COEFFICIENTS["X7"] * x7)
            + (MLR_COEFFICIENTS["X9"] * x9)
            + (MLR_COEFFICIENTS["X10"] * x10)
        )

        y_pred_rounded = round(y_pred, 3)
        if y_pred >= 9.80:
            status = "Kritis / Tinggi (Bahaya emisi gas & resiko dekomposisi)"
            zone = "critical_high"
        elif y_pred < 9.70:
            status = "Rendah (Di bawah batas efisiensi bleaching target)"
            zone = "low"
        else:
            status = "Optimal / Ideal (Dalam rentang spesifikasi 9.70 – 9.80 g/L)"
            zone = "optimal"

        return {
            "formula": "Y = 3.11 - 0.1407*X1 + 0.003192*X2 + 0.00613*X3 + 0.799*X4 + 0.2343*X5 - 0.0220*X7 - 0.0607*X9 - 0.02148*X10",
            "predicted_clo2_concentration_g_L": y_pred_rounded,
            "operational_status": status,
            "target_zone": zone,
            "input_variables": {
                "X1_naclo3_feed": x1,
                "X2_naclo3_conc": x2,
                "X3_nacl_conc": x3,
                "X4_hcl_feed": x4,
                "X5_hcl_conc": x5,
                "X7_gen_temp": x7,
                "X9_abs_temp": x9,
                "X10_abs_rate": x10,
            },
            "dominant_positive_driver": "HCl Feed (X4) dengan koefisien +0.7990",
            "dominant_negative_driver": "NaClO3 Feed (X1) dengan koefisien -0.1407",
        }

    def _exec_search_sop(self, query: str, context: ProcessContext) -> list[dict[str, Any]]:
        q_lower = query.lower()
        results = []
        docs = getattr(context, "knowledge_refs", []) or getattr(context, "knowledge_documents", [])
        for doc in docs:
            title = doc.get("title", "")
            ref = doc.get("reference_code", "")
            content = doc.get("content", "") or doc.get("summary", "")
            tags = doc.get("tags", [])
            # Search match
            if (
                any(w in title.lower() for w in q_lower.split())
                or any(w in ref.lower() for w in q_lower.split())
                or any(w in content.lower() for w in q_lower.split())
                or any(w in " ".join(tags).lower() for w in q_lower.split())
            ):
                results.append({
                    "reference_code": ref,
                    "title": title,
                    "doc_type": doc.get("doc_type", "sop"),
                    "summary_content": content[:350] if content else "Prosedur operasional standar unit produksi ClO2.",
                })

        if not results:
            # Fallback built-in safety rules
            results = [
                {
                    "reference_code": "SOP-CLO2-DEC01",
                    "title": "SOP Mitigasi Dekomposisi Gas ClO2 & Kenaikan Suhu Generator",
                    "doc_type": "safety_sop",
                    "summary_content": "Saat konsentrasi ClO2 > 9.80 g/L atau suhu generator > 47°C: Naikkan laju air absorber (X10) bertahap 3-5%, turunkan umpan HCl (X4) 5%, periksa pasokan air pendingin (chilled water X9 < 9.0°C), dan hindari getaran mekanik.",
                },
                {
                    "reference_code": "SOP-CLO2-LOW01",
                    "title": "SOP Penanganan Konsentrasi ClO2 Rendah (< 9.70 g/L)",
                    "doc_type": "operational_sop",
                    "summary_content": "Saat ClO2 < 9.70 g/L: Naikkan umpan HCl Feed (X4) bertahap 2-3%, verifikasi konsentrasi larutan NaClO3 (X2) dan asam klorida (X5), serta lakukan validasi titrasi lab iodometri titik SP-02.",
                },
            ]
        return results

    def _exec_diagnose_deviations(self, context: ProcessContext) -> dict[str, Any]:
        telemetry = self._exec_get_live_telemetry(context)["telemetry"]
        clo2_info = telemetry.get("clo2_concentration", {})
        clo2_val = clo2_info.get("value", 9.60)

        diagnoses = []
        for dev in context.deviations:
            pname = dev.get("parameter_name")
            pinfo = telemetry.get(pname, {})
            diagnoses.append({
                "parameter": pname,
                "current_value": pinfo.get("value"),
                "unit": pinfo.get("unit"),
                "severity": dev.get("severity"),
                "reasoning": f"Penyimpangan pada {pname} mempengaruhi kesetimbangan kinetika dan yield produk ClO2.",
            })

        return {
            "current_clo2": clo2_val,
            "status": "normal" if 9.70 <= clo2_val <= 9.80 else ("kritis_tinggi" if clo2_val > 9.80 else "rendah"),
            "active_deviations": diagnoses,
            "recommended_priority_1": "Absorber Chilled Water Rate (X10) & Temperature (X9)",
            "recommended_priority_2": "Generator Chemical Feed Ratio (X4 / X1)",
        }

    def _execute_tool(self, tool_name: str, args: dict[str, Any], context: ProcessContext) -> Any:
        logger.info("Executing agent tool: %s with args: %s", tool_name, args)
        if tool_name == "get_live_telemetry":
            return self._exec_get_live_telemetry(context)
        elif tool_name == "get_parameter_history_and_trend":
            return self._exec_get_parameter_history(context, args.get("parameter_name", "clo2_concentration"))
        elif tool_name == "calculate_mlr_prediction":
            return self._exec_calculate_mlr(args)
        elif tool_name == "search_sop_and_safety_rules":
            return self._exec_search_sop(args.get("query", ""), context)
        elif tool_name == "diagnose_process_deviations":
            return self._exec_diagnose_deviations(context)
        return {"error": f"Tool '{tool_name}' tidak dikenali."}

    # -------------------------------------------------------------------------
    # Core Agent Dialogue & ReAct Execution Loop
    # -------------------------------------------------------------------------
    def chat(
        self, context: ProcessContext, message: str, history: list[dict[str, str]]
    ) -> AgentChatReply:
        """Interactive contextual assistant dialogue powered by OpenClaw ClO2 Intelligence."""
        # 1. Try real LLM execution with OpenAI Tool Calling format
        if self.base_url and self.api_key:
            try:
                reply = self._chat_via_llm_agent(context, message, history)
                if reply and reply.reply.strip():
                    return reply
            except Exception as exc:  # noqa: BLE001
                logger.warning("LLM Agent tool execution failed, using autonomous local agent: %s", exc)

        # 2. Autonomous Local Agent Execution (executes tools & provides deep reasoning)
        return self._chat_via_local_agent(context, message, history)

    def _chat_via_llm_agent(
        self, context: ProcessContext, message: str, history: list[dict[str, str]]
    ) -> AgentChatReply:
        """Multi-turn tool-calling ReAct agent loop communicating with OpenClaw / 9Router API."""
        live_data = self._exec_get_live_telemetry(context)
        system_content = (
            f"{OPENCLAW_SYSTEM_PROMPT}\n\n"
            f"Kondisi Pabrik Saat Ini:\n"
            f"{json.dumps(live_data, indent=2, ensure_ascii=False)}"
        )

        messages_payload: list[dict[str, Any]] = [{"role": "system", "content": system_content}]
        for h in history[-6:]:
            messages_payload.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages_payload.append({"role": "user", "content": message})

        with httpx.Client(timeout=self.timeout) as client:
            # Step 1: Initial call with tools
            first_resp = client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json={
                    "model": getattr(settings, "OPENCLAW_MODEL", "gpt-4o-mini"),
                    "messages": messages_payload,
                    "tools": self.get_tools_schema(),
                    "tool_choice": "auto",
                    "temperature": 0.3,
                },
            )
            first_resp.raise_for_status()
            resp_json = first_resp.json()
            choice = resp_json["choices"][0]
            msg_obj = choice["message"]

            # Step 2: Check if model invoked tool calls
            tool_calls = msg_obj.get("tool_calls")
            if tool_calls and isinstance(tool_calls, list):
                logger.info("OpenClaw Agent invoked %d tool(s)", len(tool_calls))
                messages_payload.append(msg_obj)

                for tc in tool_calls:
                    tc_id = tc.get("id", "tool_call_1")
                    fn_name = tc.get("function", {}).get("name", "")
                    fn_args_raw = tc.get("function", {}).get("arguments", "{}")
                    try:
                        fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                    except Exception:
                        fn_args = {}

                    tool_output = self._execute_tool(fn_name, fn_args, context)

                    messages_payload.append({
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "name": fn_name,
                        "content": json.dumps(tool_output, ensure_ascii=False),
                    })

                # Step 3: Second call to generate final synthesized answer
                second_resp = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json={
                        "model": getattr(settings, "OPENCLAW_MODEL", "gpt-4o-mini"),
                        "messages": messages_payload,
                        "temperature": 0.3,
                    },
                )
                second_resp.raise_for_status()
                final_text = second_resp.json()["choices"][0]["message"]["content"]
                return AgentChatReply(
                    reply=final_text,
                    source="openclaw-agent",
                    related_parameters=["clo2_concentration", "flow_rate", "so2_dosage", "temperature"],
                )

            # Direct response without tools
            reply_content = msg_obj.get("content", "")
            return AgentChatReply(
                reply=reply_content,
                source="openclaw-llm",
                related_parameters=["clo2_concentration", "flow_rate", "so2_dosage"],
            )

    def _chat_via_local_agent(
        self, context: ProcessContext, message: str, history: list[dict[str, str]]
    ) -> AgentChatReply:
        """Autonomous local reasoning engine that executes tools and synthesizes deep engineering responses."""
        msg_lower = message.lower().strip()

        # Execute telemetry and diagnosis tools
        live_telemetry = self._exec_get_live_telemetry(context)["telemetry"]
        clo2_info = live_telemetry.get("clo2_concentration", {})
        clo2_val = clo2_info.get("value", 9.60)
        x1 = live_telemetry.get("naclo3_feed", {}).get("value", 28.01)
        x2 = live_telemetry.get("naclo3_concentration", {}).get("value", 437.1)
        x3 = live_telemetry.get("nacl_concentration", {}).get("value", 95.5)
        x4 = live_telemetry.get("hcl_feed", {}).get("value", 4.12)
        x5 = live_telemetry.get("hcl_concentration", {}).get("value", 31.5)
        x7 = live_telemetry.get("generator_temperature", {}).get("value", 46.7)
        x9 = live_telemetry.get("absorber_water_temperature", {}).get("value", 8.4)
        x10 = live_telemetry.get("absorber_water_rate", {}).get("value", 104.8)

        # 1. Condition & Process Status Query
        if any(w in msg_lower for w in ["kondisi", "status", "bagaimana", "saat ini", "telemetri", "bacaan"]):
            diagnosis = self._exec_diagnose_deviations(context)
            clo2_status = (
                "**Tinggi / Kritis (> 9.80 g/L)**"
                if clo2_val > 9.80
                else "**Rendah (< 9.70 g/L)**"
                if clo2_val < 9.70
                else "**Normal & Optimal (9.70 – 9.80 g/L)**"
            )
            reply = (
                f"Laporan Diagnosis AI Agent OpenClaw untuk Bapak:\n\n"
                f"**[Status Produk ClO₂ Terkini]**\n"
                f"• Konsentrasi Produk (Y): **{clo2_val:.2f} g/L** — {clo2_status}\n"
                f"• Deviasi Terdeteksi: **{len(context.deviations)} parameter**\n\n"
                f"**[Telemetri 8 Variabel Proses Kimia]**\n"
                f"• Umpan NaClO₃ (X1): **{x1:.2f} m³/h** | Konsentrasi (X2): **{x2:.1f} g/L**\n"
                f"• Konsentrasi NaCl (X3): **{x3:.1f} g/L**\n"
                f"• Umpan HCl (X4): **{x4:.2f} m³/h** | Konsentrasi (X5): **{x5:.1f} %**\n"
                f"• Suhu Gas Generator (X7): **{x7:.1f} °C**\n"
                f"• Suhu Chilled Water Absorber (X9): **{x9:.1f} °C**\n"
                f"• Laju Alir Air Absorber (X10): **{x10:.1f} m³/h**\n\n"
                f"**[Analisis Kinetika & Mitigasi Operasional]**\n"
                + (
                    "Konsentrasi ClO₂ berada di bawah ambang target 9.70 g/L. Kinetika reduksi klorat melambat. Pertimbangkan menaikkan HCl Feed (X4) bertahap 2–3% atau verifikasi kemurnian konsentrasi asam klorida (X5)."
                    if clo2_val < 9.70
                    else "Konsentrasi ClO₂ melebihi batas 9.80 g/L! Ada resiko gas loss dan kenaikan parsial tekanan ClO₂. Segera naikkan laju air absorber (X10) secara bertahap 3–5% dan kurangi umpan HCl (X4) sebesar 5%."
                    if clo2_val > 9.80
                    else "Keseimbangan stoikiometri antara asam klorida dan klorat berada pada titik optimal. Pertahankan kestabilan setpoint saat ini."
                )
            )
            return AgentChatReply(reply=reply, source="openclaw-agent", related_parameters=["clo2_concentration", "flow_rate"])

        # 2. Recommendations & Safety SOP Query
        if any(w in msg_lower for w in ["rekomendasi", "saran", "tindakan", "sop", "mitigasi", "aturan", "safety"]):
            sop_results = self._exec_search_sop(message, context)
            sop_text = "\n".join(f"• **{s['reference_code']} — {s['title']}**\n  {s['summary_content']}" for s in sop_results[:2])

            if ">" in msg_lower or "9.8" in msg_lower or "tinggi" in msg_lower or "kritis" in msg_lower or clo2_val > 9.80:
                reply = (
                    "**[Prosedur Mitigasi Konsentrasi ClO₂ > 9.80 g/L / Kritis]**\n\n"
                    "1. **Prioritas 1 (Absorber System):** Segera naikkan laju alir air pendingin absorber (X10) secara bertahap 3–5% untuk meningkatkan penyerapan gas dan menurunkan kepekatan larutan produk.\n"
                    "2. **Prioritas 2 (Generator Reaction):** Turunkan umpan HCl Feed (X4) sebesar 5% untuk meredam laju pembentukan gas berlebih di reaktor.\n"
                    "3. **Prioritas 3 (Chilled Water):** Pastikan suhu air absorber (X9) tetap terjaga dingin di bawah 9.0 °C guna memaksimalkan kelarutan ClO₂.\n"
                    "4. **Prioritas 4 (Validasi Lab):** Lakukan sampling di titik SP-02 untuk validasi analisa titrasi iodometri.\n\n"
                    f"**[Referensi Dokumen SOP Relevan]**\n{sop_text}"
                )
            else:
                reply = (
                    f"**[Prosedur Penanganan Konsentrasi ClO₂ Rendah (< 9.70 g/L, saat ini: {clo2_val:.2f} g/L)]**\n\n"
                    "1. **Prioritas 1 (Generator Reaction):** Naikkan laju umpan HCl Feed (X4) secara bertahap 2–3% untuk memacu kinetika pembentukan klorin dioksida.\n"
                    "2. **Prioritas 2 (Kualitas Reagen):** Periksa konsentrasi larutan NaClO₃ (X2) dan konsentrasi asam klorida (X5).\n"
                    "3. **Prioritas 3 (Absorber Balance):** Sesuaikan laju air absorber (X10) agar densitas larutan mencapai rentang spesifikasi 9.70 – 9.80 g/L.\n\n"
                    f"**[Referensi Dokumen SOP Relevan]**\n{sop_text}"
                )
            return AgentChatReply(reply=reply, source="openclaw-agent", related_parameters=["clo2_concentration", "so2_dosage"])

        # 3. MLR Equation & Calculation Query
        if any(w in msg_lower for w in ["rumus", "formula", "mlr", "hitung", "prediksi", "persamaan", "model"]):
            mlr_res = self._exec_calculate_mlr({
                "x1_naclo3_feed": x1,
                "x2_naclo3_conc": x2,
                "x3_nacl_conc": x3,
                "x4_hcl_feed": x4,
                "x5_hcl_conc": x5,
                "x7_gen_temp": x7,
                "x9_abs_temp": x9,
                "x10_abs_rate": x10,
            })
            reply = (
                "**[Model Multiple Linear Regression (MLR) ClO₂]**\n\n"
                "Persamaan Regresi Resmi Pabrik:\n"
                "**Y = 3.11 - 0.1407·X₁ + 0.003192·X₂ + 0.00613·X₃ + 0.799·X₄ + 0.2343·X₅ - 0.0220·X₇ - 0.0607·X₉ - 0.02148·X₁₀**\n\n"
                f"**[Hasil Eksekusi Perhitungan Saat Ini]**\n"
                f"• Prediksi Konsentrasi ClO₂ (Y): **{mlr_res['predicted_clo2_concentration_g_L']} g/L**\n"
                f"• Status Operasional: **{mlr_res['operational_status']}**\n"
                f"• Pengaruh Positif Terbesar: **{mlr_res['dominant_positive_driver']}**\n"
                f"• Pengaruh Negatif Terbesar: **{mlr_res['dominant_negative_driver']}**\n\n"
                "Silakan berikan nilai angka simulasi (contoh: *'hitung jika X4=4.5 dan X10=100'*) untuk menguji hasil prediksi langsung."
            )
            return AgentChatReply(reply=reply, source="openclaw-agent", related_parameters=["clo2_concentration"])

        # 4. General Engineering Response
        reply = (
            f"Baik Bapak, terkait pertanyaan mengenai *'{message}'*:\n\n"
            f"Berdasarkan telemetri aktif pabrik (Konsentrasi ClO₂: **{clo2_val:.2f} g/L**, NaClO₃ Feed: **{x1:.2f} m³/h**, HCl Feed: **{x4:.2f} m³/h**, Suhu Chilled Water: **{x9:.1f} °C**), "
            "AI Agent OpenClaw siap membantu melakukan verifikasi data sensor, simulasi stoikiometri, atau pencarian SOP mitigasi bahaya kimia.\n\n"
            "Ada parameter proses atau skenario simulasi tertentu yang ingin Bapak evaluasi bersama?"
        )
        return AgentChatReply(reply=reply, source="openclaw-agent", related_parameters=["clo2_concentration", "flow_rate"])

    # -------------------------------------------------------------------------
    # Generative AI Process Analysis (for Insights / Dashboard Buttons)
    # -------------------------------------------------------------------------
    def analyze_process(self, context: ProcessContext) -> AgentAnalysis:
        """Run deep chemical engineering diagnosis based on OpenClaw ClO2 rules and telemetries."""
        if self.base_url and self.api_key:
            try:
                return self._analyze_via_llm(context)
            except Exception as exc:  # noqa: BLE001
                logger.warning("LLM Analysis call failed, falling back to autonomous domain engine: %s", exc)

        return self._analyze_via_domain_engine(context)

    def _analyze_via_llm(self, context: ProcessContext) -> AgentAnalysis:
        live_telemetry = self._exec_get_live_telemetry(context)
        prompt = f"""Konteks Telemetri Pabrik ClO2 Terkini:
{json.dumps(live_telemetry, indent=2, ensure_ascii=False)}

Tugas: Lakukan analisis mendalam terhadap kinetika reaksi pembentukan ClO2, diagnosis deviasi variabel proses, dan susun rekomendasi bertahap 4-tingkat.
Keluarkan output murni JSON sesuai skema berikut:
{{
  "insight": {{
    "summary": "Ringkasan diagnosis kondisi proses...",
    "details": "Penjelasan mendalam kinetika reaksi, stoikiometri HCl:NaClO3, dan dampak suhu absorber...",
    "related_parameters": ["clo2_concentration", "hcl_feed", "absorber_water_rate"],
    "confidence": 0.94
  }},
  "recommendations": [
    {{
      "recommendation": "Tindakan rekomendasi bertahap...",
      "reason": "Alasan proses kimia dan keselamatan...",
      "suggested_action": "Set point adjustment bertahap...",
      "related_parameters": ["hcl_feed", "absorber_water_rate"]
    }}
  ]
}}
"""
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json={
                    "model": getattr(settings, "OPENCLAW_MODEL", "gpt-4o-mini"),
                    "messages": [
                        {"role": "system", "content": OPENCLAW_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            data = json.loads(content)

            insight_data = data.get("insight", {})
            insight = AgentInsight(
                summary=insight_data.get("summary", "Analisis proses ClO₂ selesai."),
                details=insight_data.get("details"),
                related_parameters=insight_data.get("related_parameters", ["clo2_concentration"]),
                source="openclaw-agent",
                confidence=insight_data.get("confidence", 0.94),
            )

            recommendations = [
                AgentRecommendation(
                    recommendation=rec.get("recommendation", ""),
                    reason=rec.get("reason"),
                    suggested_action=rec.get("suggested_action"),
                    related_parameters=rec.get("related_parameters", ["clo2_concentration"]),
                    source="openclaw-agent",
                )
                for rec in data.get("recommendations", [])
            ]
            return AgentAnalysis(insight=insight, recommendations=recommendations)

    def _analyze_via_domain_engine(self, context: ProcessContext) -> AgentAnalysis:
        live_telemetry = self._exec_get_live_telemetry(context)["telemetry"]
        clo2_info = live_telemetry.get("clo2_concentration", {})
        clo2_val = clo2_info.get("value", 9.60)
        hcl_feed = live_telemetry.get("hcl_feed", {}).get("value", 4.12)
        abs_rate = live_telemetry.get("absorber_water_rate", {}).get("value", 104.8)

        deviations = context.deviations
        has_dev = len(deviations) > 0

        if clo2_val > 9.80:
            summary = (
                f"Terdeteksi konsentrasi ClO₂ tinggi ({clo2_val:.2f} g/L) melebihi ambang batas optimum 9.80 g/L. "
                "Resiko peningkatan parsial tekanan gas ClO₂ dan potensi emisi pada kolom absorpsi."
            )
            details = (
                "Berdasarkan model regresi MLR dan kinetika reaksi asam-klorat:\n"
                "1. Laju alir umpan HCl Feed (X4) memicu kinetika reduksi berlebih sehingga produksi gas melampaui kapasitas absorpsi sesaat.\n"
                "2. Suhu absorber dan laju air pendingin (X10) perlu disesuaikan untuk menjaga kestabilan penyerapan gas.\n"
                "3. Penyesuaian wajib dilakukan bertahap sesuai protokol keselamatan industri SOP-CLO2-DEC01."
            )
            recs = [
                AgentRecommendation(
                    recommendation="Prioritas 1 (Absorber) — Naikkan laju air absorber (X10) bertahap 3–5%.",
                    reason="Meningkatkan rasio pengenceran produk dan mencegah pelepasan gas ClO₂ bebas ke venting absorber.",
                    suggested_action=f"Naikkan setpoint air absorber dari {abs_rate:.1f} m³/h menjadi {abs_rate * 1.04:.1f} m³/h secara bertahap.",
                    related_parameters=["absorber_water_rate", "clo2_concentration"],
                    source="openclaw-agent",
                ),
                AgentRecommendation(
                    recommendation="Prioritas 2 (Generator) — Turunkan umpan HCl Feed (X4) sebesar 5%.",
                    reason="Meredam laju kinetika pembentukan gas ClO₂ agar kembali seimbang dengan laju absorpsi.",
                    suggested_action=f"Koreksi laju umpan HCl Feed dari {hcl_feed:.2f} m³/h menuju {hcl_feed * 0.95:.2f} m³/h.",
                    related_parameters=["hcl_feed", "clo2_concentration"],
                    source="openclaw-agent",
                ),
                AgentRecommendation(
                    recommendation="Prioritas 4 (Validasi Lab) — Ambil sampel produk SP-02 untuk titrasi iodometri.",
                    reason="Memvalidasi ketepatan pembacaan analyzer inline sebelum perubahan setpoint lanjutan.",
                    suggested_action="Verifikasi konsentrasi aktual produk di laboratorium kendali mutu kimia.",
                    related_parameters=["clo2_concentration"],
                    source="openclaw-agent",
                ),
            ]
        elif clo2_val < 9.70:
            summary = (
                f"Konsentrasi ClO₂ berada di bawah target spesifikasi ({clo2_val:.2f} g/L < 9.70 g/L). "
                "Dibutuhkan optimasi laju reaktan guna memulihkan efisiensi reaksi generator."
            )
            details = (
                "Berdasarkan analisis koefisien MLR (HCl Feed memiliki bobot positif terbesar +0.799):\n"
                "1. Penurunan konsentrasi dipicu oleh perlambatan laju kinetika reduksi atau rasio HCl:NaClO₃ yang belum optimal.\n"
                "2. Suhu absorber dan laju alir air pendingin perlu dijaga agar tidak terjadi over-dilution larutan produk."
            )
            recs = [
                AgentRecommendation(
                    recommendation="Prioritas 2 (Generator) — Naikkan umpan HCl Feed (X4) secara bertahap 2–3%.",
                    reason="Memacu kinetika reaksi pembentukan ClO₂ untuk mengangkat konsentrasi ke rentang 9.70 – 9.80 g/L.",
                    suggested_action=f"Tingkatkan HCl Feed dari {hcl_feed:.2f} m³/h menjadi {hcl_feed * 1.025:.2f} m³/h.",
                    related_parameters=["hcl_feed", "clo2_concentration"],
                    source="openclaw-agent",
                ),
                AgentRecommendation(
                    recommendation="Prioritas 3 (Chemical Quality) — Periksa konsentrasi larutan bahan baku HCl (X5) dan NaClO₃ (X2).",
                    reason="Memastikan deviasi bukan disebabkan oleh penurunan kemurnian reagen di tangki penyimpanan.",
                    suggested_action="Lakukan uji densitas dan konsentrasi larutan umpan reagen kimia.",
                    related_parameters=["hcl_concentration", "naclo3_concentration"],
                    source="openclaw-agent",
                ),
            ]
        else:
            summary = (
                f"Kondisi proses stabil dan optimal (Konsentrasi ClO₂: {clo2_val:.2f} g/L dalam rentang ideal 9.70 – 9.80 g/L). "
                "Seluruh variabel reaktor dan absorber berada pada titik kesetimbangan kinetika terbaik."
            )
            details = (
                "Keseimbangan stoikiometri reaksi ClO₂ berjalan optimal. Tidak ada interlock atau bahaya dekomposisi aktif. "
                "Pertahankan setpoint variabel proses saat ini."
            )
            recs = [
                AgentRecommendation(
                    recommendation="Pertahankan kestabilan rasio umpan dan pemantauan berkala.",
                    reason="Kondisi kinetika dan absorpsi produk memenuhi seluruh spesifikasi keselamatan dan mutu.",
                    suggested_action="Lanjutkan pemantauan inline dan catat log data telemetri secara rutin.",
                    related_parameters=["clo2_concentration"],
                    source="openclaw-agent",
                )
            ]

        insight = AgentInsight(
            summary=summary,
            details=details,
            related_parameters=["clo2_concentration", "hcl_feed", "absorber_water_rate"],
            source="openclaw-agent",
            confidence=0.95,
        )
        return AgentAnalysis(insight=insight, recommendations=recs)
