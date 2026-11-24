"""Unit tests for TextNormalizer and EmotionDetector in tts_service."""

from app.services.tts_service import TextNormalizer, EmotionDetector
from tests.support import expect


def test_text_normalizer_empty_and_none():
    expect(TextNormalizer.normalize_for_tts("") == "", "empty string returns empty")
    expect(TextNormalizer.normalize_for_tts(None) == "", "None returns empty string")


def test_text_normalizer_abbreviations():
    raw = "Dr. Smith and Mr. Jones went to the clinic vs. the hospital approx. 5 miles away, etc."
    normalized = TextNormalizer.normalize_for_tts(raw)
    expect("Doctor Smith" in normalized, "Dr. expanded to Doctor")
    expect("Mister Jones" in normalized, "Mr. expanded to Mister")
    expect("versus the hospital" in normalized, "vs. expanded to versus")
    expect("approximately" in normalized, "approx. expanded to approximately")
    expect("etcetera" in normalized, "etc. expanded to etcetera")


def test_text_normalizer_markdown_and_links():
    raw = "Check **bold** and *italic* and `code` at https://example.com/docs # Heading"
    normalized = TextNormalizer.normalize_for_tts(raw)
    expect("**" not in normalized and "*" not in normalized, "asterisks removed")
    expect("`" not in normalized, "backticks removed")
    expect("https://" not in normalized and "link" in normalized, "url replaced with link")
    expect("#" not in normalized, "header symbols removed")


def test_text_normalizer_punctuation_and_phone():
    raw = "Call (555) 123-4567 right now!!!! Really???"
    normalized = TextNormalizer.normalize_for_tts(raw)
    expect("5 5 5 1 2 3 4 5 6 7" in normalized, "phone digits spaced")
    expect("!" in normalized and "!!!!" not in normalized, "exclamations compressed")
    expect("?" in normalized and "???" not in normalized, "question marks compressed")


def test_emergency_detector():
    expect(TextNormalizer.normalize_for_emergency(None) is None, "None returns None")
    expect(TextNormalizer.normalize_for_emergency("Everything is great") is None, "normal text returns None")

    res_fire = TextNormalizer.normalize_for_emergency("Help, there is a fire in the kitchen!")
    expect(res_fire is not None and "Leave the building" in res_fire, "fire emergency detected")

    res_911 = TextNormalizer.normalize_for_emergency("This is an emergency medical situation")
    expect(res_911 is not None and "911" in res_911, "emergency detected")


def test_emotion_detector_tags():
    # Paralinguistic tag precedence
    expect(EmotionDetector.detect_emotion("[laugh] That was funny") == "[laugh]", "detects laugh tag")
    expect(EmotionDetector.detect_emotion("[sigh] Long day today") == "[sigh]", "detects sigh tag")
    expect(EmotionDetector.detect_emotion(None) == "neutral", "None returns neutral")


def test_emotion_detector_keywords():
    expect(EmotionDetector.detect_emotion("I am so happy and excited today!") == "happy", "happy detected")
    expect(EmotionDetector.detect_emotion("I am feeling very sad and sorry") == "sad", "sad detected")
    expect(EmotionDetector.detect_emotion("This is normal everyday prose.") == "neutral", "neutral default")


def test_process_text_with_emotion():
    cleaned, style, emotion = EmotionDetector.process_text_with_emotion("[chuckle] What a great joke!")
    expect(cleaned == "What a great joke!", "tag stripped from cleaned text")
    expect(emotion == "[chuckle]", "emotion tag identified")
    expect("chuckle" in style, "style prompt returned")

    # None handling
    c_none, s_none, e_none = EmotionDetector.process_text_with_emotion(None)
    expect(c_none == "", "cleaned None is empty string")
    expect(e_none == "neutral", "emotion for None is neutral")


def test_dotted_phone_number_is_read_as_digits_only():
    """Dots in 555.123.4567 are not spoken."""
    normalized = TextNormalizer.normalize_for_tts("Call 555.123.4567 now")
    expect("5 5 5 1 2 3 4 5 6 7" in normalized, "dots are not spoken as separators")
    expect("." not in normalized, "no stray periods remain in the phone number")


def test_emergency_keywords_match_whole_words_only():
    """Emergency keywords match whole words, so "fired" is not a fire."""
    for text in ("I got fired today", "Which fireplace should I buy?", "Is Firefox faster?"):
        expect(TextNormalizer.normalize_for_emergency(text) is None, f"no emergency for: {text}")
    emergencies = (
        "The house is on fire!",
        "There are fires near us",
        "Two heart attacks this year",
        "EMERGENCY",
    )
    for text in emergencies:
        expect(TextNormalizer.normalize_for_emergency(text) is not None, f"emergency for: {text}")


def test_decimal_coordinates_are_not_read_as_phone_numbers():
    """A longitude such as -122.4194155 keeps its decimal point."""
    normalized = TextNormalizer.normalize_for_tts("Longitude -122.4194155 here")
    expect("122.4194155" in normalized, "decimal number left alone")
    phones = (
        "555-123-4567", "555 123 4567", "5551234567",
        "(555)123-4567", "555 123-4567", "(555)1234567",
    )
    for raw in phones:
        normalized = TextNormalizer.normalize_for_tts(f"Call {raw} now")
        expect("5 5 5 1 2 3 4 5 6 7" in normalized, f"phone read as digits: {raw}")
