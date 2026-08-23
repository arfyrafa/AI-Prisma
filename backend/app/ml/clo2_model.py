"""ClO2 Multiple Linear Regression (MLR) Model Specifications and Metadata.

Derived from the empirical research database in .openclaw.
"""

from typing import Any

MLR_METADATA: dict[str, Any] = {
    "model_name": "MLR_Model_19_Mei_2026",
    "model_version": "1.0.0",
    "target_variable": "ClO2 Concentration Product",
    "target_symbol": "Y",
    "target_unit": "g/L",
    "intercept": 3.11,
    "coefficients": {
        "X1": -0.1407,
        "X2": 0.003192,
        "X3": 0.00613,
        "X4": 0.7990,
        "X5": 0.2343,
        "X7": -0.0220,
        "X9": -0.0607,
        "X10": -0.02148,
    },
    "equation": "Y = 3.11 - 0.1407*X1 + 0.003192*X2 + 0.00613*X3 + 0.799*X4 + 0.2343*X5 - 0.0220*X7 - 0.0607*X9 - 0.02148*X10",
    "target_range": {
        "min_spec": 9.0,
        "max_spec": 11.0,
        "optimum_low": 9.7,
        "unit": "g/L",
    },
}

VARIABLE_METADATA: dict[str, dict[str, Any]] = {
    "X1": {
        "name": "NaClO3 Feed",
        "unit": "m3/h",
        "min_valid": 14.0,
        "max_valid": 19.5,
        "baseline": 17.37,
        "t_value_rank": 5,
        "description": "Laju umpan larutan sodium klorat ke generator.",
    },
    "X2": {
        "name": "NaClO3 Concentration",
        "unit": "g/L",
        "min_valid": 360.0,
        "max_valid": 520.0,
        "baseline": 437.16,
        "t_value_rank": 2,
        "description": "Konsentrasi klorat dalam larutan umpan.",
    },
    "X3": {
        "name": "NaCl Concentration",
        "unit": "g/L",
        "min_valid": 40.0,
        "max_valid": 140.0,
        "baseline": 95.50,
        "t_value_rank": 3,
        "description": "Konsentrasi garam sisa dalam larutan chlorate.",
    },
    "X4": {
        "name": "HCl Feed",
        "unit": "m3/h",
        "min_valid": 3.0,
        "max_valid": 5.0,
        "baseline": 4.13,
        "t_value_rank": 4,
        "description": "Laju alir umpan asam klorida agen reduksi.",
    },
    "X5": {
        "name": "HCl Concentration",
        "unit": "%",
        "min_valid": 29.0,
        "max_valid": 34.0,
        "baseline": 31.55,
        "t_value_rank": 1,
        "description": "Konsentrasi asam klorida (parameter dominansi T-Value tertinggi).",
    },
    "X7": {
        "name": "Generator ClO2 Output Temperature",
        "unit": "°C",
        "min_valid": 40.0,
        "max_valid": 54.0,
        "baseline": 46.70,
        "t_value_rank": 7,
        "description": "Suhu gas keluaran reaktor generator ClO₂.",
    },
    "X9": {
        "name": "H2O Chilled Water Temperature",
        "unit": "°C",
        "min_valid": 6.0,
        "max_valid": 12.0,
        "baseline": 8.42,
        "t_value_rank": 8,
        "description": "Suhu air pendingin yang diumpankan ke absorber.",
    },
    "X10": {
        "name": "Absorber H2O Rate",
        "unit": "m3/h",
        "min_valid": 85.0,
        "max_valid": 120.0,
        "baseline": 104.78,
        "t_value_rank": 6,
        "description": "Laju alir air penyerap gas ClO₂ pada kolom absorber.",
    },
}
