"""Rule-based stand-in for the external AI agent.

It reads the real process context and reasons over it with explicit rules, so
the demo is honest: every output is tagged ``mock-agent`` and the UI labels it
as simulation. It never returns a confidence score, because it does not have
one to report.
"""

from typing import Any

from app.integrations.agent.base import (
    AgentAnalysis,
    AgentChatReply,
    AgentInsight,
    AgentProvider,
    AgentRecommendation,
    ProcessContext,
)

# Which upstream parameters plausibly drive a given target parameter in a
# ClO2 generator. Used to phrase contributing factors, not to prove causation.
INFLUENCE_MAP: dict[str, list[str]] = {
    "clo2_concentration": ["so2_dosage", "ph", "flow_rate", "temperature"],
    "ph": ["so2_dosage", "flow_rate"],
    "orp": ["so2_dosage", "ph"],
    "turbidity": ["flow_rate", "ph"],
    "pressure": ["flow_rate", "temperature"],
    "temperature": ["flow_rate", "pressure"],
}

ACTION_HINTS: dict[str, str] = {
    "so2_dosage": "Verifikasi laju dosis SO₂ terhadap set point dan periksa kalibrasi dosing pump.",
    "ph": "Periksa kontrol pH dan kondisi larutan umpan sebelum menyesuaikan dosis.",
    "flow_rate": "Periksa flow control valve dan pembacaan flow transmitter.",
    "temperature": "Periksa sistem pendingin/pemanas reaktor dan pembacaan TT.",
    "pressure": "Periksa relief line dan pembacaan pressure transmitter.",
    "clo2_concentration": "Bandingkan hasil analyzer dengan hasil laboratorium terakhir.",
    "orp": "Verifikasi probe ORP dan waktu kalibrasi terakhir.",
    "turbidity": "Periksa kejernihan larutan dan kondisi filter.",
}


def _by_name(parameters: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {item["parameter_name"]: item for item in parameters}


def _describe(parameter: dict[str, Any]) -> str:
    unit = f" {parameter.get('unit', '')}".rstrip()
    target = parameter.get("target_value")
    current = parameter.get("current_value")
    if current is None:
        return f"{parameter['display_name']}: tidak ada data"
    if target is None:
        return f"{parameter['display_name']}: {current}{unit}"
    delta = round(current - target, 3)
    arah = "di atas" if delta > 0 else "di bawah" if delta < 0 else "sama dengan"
    return f"{parameter['display_name']} {current}{unit} ({arah} target {target}{unit})"


class MockAgentProvider(AgentProvider):
    name = "mock"

    def is_available(self) -> bool:
        return True

    # -- analysis ---------------------------------------------------------
    def analyze_process(self, context: ProcessContext) -> AgentAnalysis:
        params = _by_name(context.parameters)
        deviations = context.deviations

        if not deviations:
            summary = "Seluruh parameter berada dalam rentang operasi yang dikonfigurasi."
            details = (
                "Tidak ditemukan penyimpangan pada pembacaan terakhir.\n\n"
                "Kondisi saat ini:\n"
                + "\n".join(f"• {_describe(p)}" for p in context.parameters[:5])
                + "\n\nTidak ada tindakan korektif yang diperlukan saat ini. "
                "Pemantauan tetap berjalan."
            )
            insight = AgentInsight(
                summary=summary,
                details=details,
                related_parameters=[p["parameter_name"] for p in context.parameters[:5]],
                source="mock-agent",
            )
            return AgentAnalysis(insight=insight, recommendations=[])

        primary = max(deviations, key=lambda d: abs(d.get("deviation") or 0))
        target_name = primary["parameter_name"]
        candidates = INFLUENCE_MAP.get(target_name, [])

        contributing: list[dict[str, Any]] = []
        for name in candidates:
            parameter = params.get(name)
            if not parameter or parameter.get("current_value") is None:
                continue
            target = parameter.get("target_value")
            if target is None:
                continue
            offset = abs(parameter["current_value"] - target)
            # Ignore noise: only deviations worth more than 5% of the operating
            # range are reported as potential contributing factors.
            span = None
            if parameter.get("minimum_value") is not None and parameter.get("maximum_value") is not None:
                span = abs(parameter["maximum_value"] - parameter["minimum_value"])
            threshold = span * 0.05 if span else abs(target) * 0.02
            if offset > threshold:
                contributing.append({**parameter, "_offset_ratio": offset / (span or abs(target) or 1)})

        contributing.sort(key=lambda item: item["_offset_ratio"], reverse=True)

        related = [target_name] + [p["parameter_name"] for p in contributing]

        summary = primary["message"]
        lines = [
            f"Kondisi: {_describe(params.get(target_name, {'display_name': target_name, 'current_value': primary['current_value']}))}.",
            "",
            "Faktor yang berpotensi berkontribusi:",
        ]
        if contributing:
            lines += [f"• {_describe(p)}" for p in contributing]
        else:
            lines.append("• Tidak ada parameter hulu yang menyimpang dari target secara signifikan.")

        trend = context.recent_trend.get(target_name) or []
        if len(trend) >= 3:
            arah = "naik" if trend[-1] > trend[0] else "turun" if trend[-1] < trend[0] else "stabil"
            lines += ["", f"Tren {len(trend)} pembacaan terakhir menunjukkan kecenderungan {arah}."]

        if context.knowledge_refs:
            refs = ", ".join(
                f"{ref.get('reference_code') or ref.get('title')}" for ref in context.knowledge_refs[:3]
            )
            lines += ["", f"Referensi terkait pada Knowledge Base: {refs}."]

        lines += [
            "",
            "Analisis ini bersifat indikatif dan perlu diverifikasi engineer sebelum "
            "tindakan operasional apa pun diambil.",
        ]

        insight = AgentInsight(
            summary=summary,
            details="\n".join(lines),
            related_parameters=related,
            source="mock-agent",
        )

        recommendations: list[AgentRecommendation] = []
        review_targets = [p["parameter_name"] for p in contributing[:2]] or [target_name]
        review_labels = [params[name]["display_name"] for name in review_targets if name in params]
        recommendations.append(
            AgentRecommendation(
                recommendation="Tinjau " + " dan ".join(review_labels or [target_name]) + ".",
                reason=(
                    f"Data proses saat ini menunjukkan {', '.join(review_labels) or target_name} "
                    f"menyimpang dari target dan berpotensi berkontribusi pada "
                    f"{params.get(target_name, {}).get('display_name', target_name)} yang menyimpang."
                ),
                suggested_action=" ".join(
                    ACTION_HINTS.get(name, "Verifikasi parameter terhadap prosedur operasi.")
                    for name in review_targets
                ),
                related_parameters=related,
                source="mock-agent",
            )
        )

        if primary.get("severity") == "CRITICAL":
            recommendations.append(
                AgentRecommendation(
                    recommendation=(
                        f"Lakukan verifikasi silang pembacaan "
                        f"{params.get(target_name, {}).get('display_name', target_name)} dengan laboratorium."
                    ),
                    reason="Penyimpangan berada pada level kritis sehingga kesalahan instrumen perlu disingkirkan.",
                    suggested_action="Ambil sampel dan bandingkan dengan hasil analyzer sesuai SOP pengambilan sampel.",
                    related_parameters=[target_name],
                    source="mock-agent",
                )
            )

        return AgentAnalysis(insight=insight, recommendations=recommendations)

    # -- chat -------------------------------------------------------------
    def chat(
        self, context: ProcessContext, message: str, history: list[dict[str, str]]
    ) -> AgentChatReply:
        text = message.lower()
        params = _by_name(context.parameters)
        deviations = context.deviations

        prefix = "Mode simulasi — jawaban disusun dari data proses terkini, bukan dari LLM.\n\n"

        if any(word in text for word in ("di luar", "outside", "menyimpang", "deviasi", "target")):
            if not deviations:
                body = "Tidak ada parameter yang berada di luar rentang operasi pada pembacaan terakhir."
            else:
                body = "Parameter yang berada di luar rentang operasi:\n" + "\n".join(
                    f"• {d['display_name']}: {d['current_value']} (batas {d.get('expected_min')}–{d.get('expected_max')}), {d['severity']}"
                    for d in deviations
                )
            return AgentChatReply(
                reply=prefix + body,
                source="mock-agent",
                related_parameters=[d["parameter_name"] for d in deviations],
            )

        if any(word in text for word in ("kenapa", "mengapa", "why", "penyebab")):
            analysis = self.analyze_process(context)
            return AgentChatReply(
                reply=prefix + (analysis.insight.details or analysis.insight.summary),
                source="mock-agent",
                related_parameters=analysis.insight.related_parameters,
            )

        if any(word in text for word in ("sop", "prosedur", "knowledge", "dokumen")):
            if context.knowledge_refs:
                body = "Dokumen terkait pada Knowledge Base:\n" + "\n".join(
                    f"• {ref.get('reference_code') or '-'} — {ref.get('title')}"
                    for ref in context.knowledge_refs[:5]
                )
            else:
                body = "Belum ada dokumen Knowledge Base yang cocok dengan kondisi ini."
            return AgentChatReply(reply=prefix + body, source="mock-agent")

        if any(word in text for word in ("berubah", "24 jam", "terakhir", "tren", "trend")):
            lines = []
            for name, series in context.recent_trend.items():
                if len(series) < 2 or name not in params:
                    continue
                delta = round(series[-1] - series[0], 3)
                arah = "naik" if delta > 0 else "turun" if delta < 0 else "stabil"
                lines.append(f"• {params[name]['display_name']}: {arah} {abs(delta)}")
            body = "Perubahan pada rentang data terakhir:\n" + ("\n".join(lines) or "Data belum cukup.")
            return AgentChatReply(reply=prefix + body, source="mock-agent")

        body = (
            "Kondisi proses saat ini:\n"
            + "\n".join(f"• {_describe(p)}" for p in context.parameters)
            + "\n\nCoba tanyakan: penyebab penyimpangan, parameter di luar target, "
            "perubahan terakhir, atau isi SOP terkait."
        )
        return AgentChatReply(reply=prefix + body, source="mock-agent")
