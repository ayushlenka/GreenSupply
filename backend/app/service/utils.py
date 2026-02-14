from __future__ import annotations

from decimal import Decimal


def to_float(value: Decimal | int | float) -> float:
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def safe_divide(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator
