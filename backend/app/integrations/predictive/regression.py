"""Multiple Linear Regression predictor (initial study case).

Trained on the fly from recent process history: the upstream parameters at
time t are regressed against the target parameter at t + horizon. If there is
not enough history the caller gets PredictionUnavailableError rather than a
fabricated number.
"""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

from app.integrations.predictive.base import (
    PredictionResult,
    PredictionUnavailableError,
    PredictiveModel,
)

DEFAULT_FEATURES = [
    "temperature",
    "pressure",
    "ph",
    "flow_rate",
    "so2_dosage",
    "orp",
]

MIN_TRAINING_ROWS = 30


class LinearRegressionModel(PredictiveModel):
    name = "Multiple Linear Regression (scikit-learn)"

    def predict(
        self,
        history: list[dict[str, Any]],
        target_parameter: str,
        horizon_minutes: int,
    ) -> PredictionResult:
        if len(history) < MIN_TRAINING_ROWS:
            raise PredictionUnavailableError(
                "Riwayat proses belum cukup untuk melatih model prediksi."
            )

        frame = pd.DataFrame(history).sort_values("timestamp")
        features = [c for c in DEFAULT_FEATURES if c in frame.columns and c != target_parameter]
        if target_parameter not in frame.columns or not features:
            raise PredictionUnavailableError("Parameter target tidak tersedia pada riwayat.")

        frame = frame[[*features, target_parameter, "timestamp"]].dropna()
        if len(frame) < MIN_TRAINING_ROWS:
            raise PredictionUnavailableError("Data valid belum cukup untuk melatih model.")

        # Estimate how many rows correspond to the requested horizon.
        seconds = pd.to_datetime(frame["timestamp"]).diff().dt.total_seconds().median()
        step = max(1, int(round((horizon_minutes * 60) / seconds))) if seconds and seconds > 0 else 1
        step = min(step, max(1, len(frame) // 3))

        x = frame[features].to_numpy(dtype=float)
        y = frame[target_parameter].to_numpy(dtype=float)
        x_train, y_train = x[:-step], y[step:]
        if len(x_train) < MIN_TRAINING_ROWS // 2:
            raise PredictionUnavailableError("Horizon terlalu panjang untuk riwayat yang tersedia.")

        model = LinearRegression()
        model.fit(x_train, y_train)

        fitted = model.predict(x_train)
        predicted = float(model.predict(x[-1].reshape(1, -1))[0])

        return PredictionResult(
            target_parameter=target_parameter,
            actual_value=float(y[-1]),
            predicted_value=round(predicted, 4),
            model_name=self.name,
            horizon_minutes=horizon_minutes,
            is_simulated=True,
            metadata={
                "features": features,
                "training_rows": int(len(x_train)),
                "lag_steps": step,
                "r2": round(float(r2_score(y_train, fitted)), 4),
                "mae": round(float(mean_absolute_error(y_train, fitted)), 4),
                "coefficients": {
                    feature: round(float(coef), 6)
                    for feature, coef in zip(features, model.coef_, strict=True)
                },
                "intercept": round(float(model.intercept_), 6),
                "note": "Model dilatih dari data studi kasus/simulasi, bukan data produksi nyata.",
            },
        )
