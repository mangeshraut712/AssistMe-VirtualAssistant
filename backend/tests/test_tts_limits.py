import pytest

from app.tts_limits import MAX_TTS_CHARS, assert_tts_payload_within_limit, tts_payload_length


def test_tts_payload_length_counts_text_and_style_prefix() -> None:
    assert tts_payload_length("hello", None) == 5
    assert tts_payload_length("  hi  ", "warm") == 2 + 4 + 20


def test_assert_tts_payload_rejects_over_limit_text() -> None:
    assert_tts_payload_within_limit("ok", None)
    with pytest.raises(ValueError, match="4000"):
        assert_tts_payload_within_limit("a" * (MAX_TTS_CHARS + 1), None)
