"""Fallback predictor used when no real model is wired up.

It extrapolates the recent linear trend of the target parameter. Output is
always flagged as simulated so the dashboard can label it.
"""

from typing import Any

import numpy as np

from app.integrations.predictive.base import (
    PredictionResult,
    PredictionUnavailableError,
    PredictiveModel,
)


class MockPredictiveModel(PredictiveModel):
    name = "Trend Extrapolation (mock)"

    def predict(
        self,
        history: list[dict[str, Any]],
        target_parameter: str,
        horizon_minutes: int,
    ) -> PredictionResult:
        series = [
            row[target_parameter]
            for row in history
            if row.get(target_parameter) is not None
        ]
        if len(series) < 5:
            raise PredictionUnavailableError("Riwayat proses belum cukup untuk membuat prediksi.")

        window = np.array(series[-20:], dtype=float)
        x = np.arange(len(window))
        slope, intercept = np.polyfit(x, window, 1)
        predicted = float(slope * (len(window) + 3) + intercept)

        return PredictionResult(
            target_parameter=target_parameter,
            actual_value=float(window[-1]),
            predicted_value=round(predicted, 4),
            model_name=self.name,
            horizon_minutes=horizon_minutes,
            is_simulated=True,
            metadata={
                "window": int(len(window)),
                "slope": round(float(slope), 6),
                "note": "Ekstrapolasi tren sederhana — hanya untuk demo, bukan model produksi.",
            },
        )
