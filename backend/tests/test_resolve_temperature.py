from app.sampling import resolve_temperature


def test_resolve_temperature_keeps_zero() -> None:
    assert resolve_temperature(0) == 0.0
    assert resolve_temperature(0.0) == 0.0


def test_resolve_temperature_defaults_and_clamps() -> None:
    assert resolve_temperature(None) == 0.7
    assert resolve_temperature("hot") == 0.7  # type: ignore[arg-type]
    assert resolve_temperature(1.2) == 1.2
    assert resolve_temperature(9) == 2.0
    assert resolve_temperature(-1) == 0.0
