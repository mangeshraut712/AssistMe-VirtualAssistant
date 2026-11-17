"""Unit test contracts for ImageService helper routines."""

from app.services.image_service import ImageService, parse_image_size
from tests.support import expect


def test_parse_image_size_clamps_bounds():
    """Dimensions must be clamped to the [_MIN_IMAGE_EDGE, _MAX_IMAGE_EDGE] range."""
    expect(parse_image_size("1024x1024") == (1024, 1024), "standard 1024x1024 preserved")
    expect(parse_image_size("16x16") == (64, 64), "undersized edge clamped to 64")
    expect(parse_image_size("5000x8000") == (2048, 2048), "oversized edge clamped to 2048")
    expect(parse_image_size("not-a-size") == (1024, 1024), "invalid format falls back to 1024x1024")
    expect(parse_image_size(None) == (1024, 1024), "None falls back to 1024x1024")


def test_aspect_ratio_from_size():
    """Size strings translate to normalized aspect ratios."""
    service = ImageService()
    expect(service._aspect_ratio_from_size("1024x1024") == "1:1", "1:1 square ratio")
    expect(service._aspect_ratio_from_size("1024x1792") == "9:16", "9:16 portrait ratio")
    expect(service._aspect_ratio_from_size("1792x1024") == "16:9", "16:9 landscape ratio")
    expect(service._aspect_ratio_from_size("1920x1080") == "16:9", "custom 1920x1080 reduced to 16:9")
    expect(service._aspect_ratio_from_size("1024x0") is None, "zero height returns None")
    expect(service._aspect_ratio_from_size("invalid") is None, "malformed string returns None")


def test_extract_image_from_openrouter_payloads():
    """Parser unpacks image URLs across multiple provider response formats."""
    service = ImageService()

    # Legacy Gemini shape
    legacy_data = {
        "choices": [{
            "message": {
                "images": [{"image_url": {"url": "https://cdn.example.com/legacy.png"}}]
            }
        }]
    }
    expect(
        service._extract_image_from_openrouter(legacy_data) == "https://cdn.example.com/legacy.png",
        "extracts from legacy message.images structure",
    )

    # Modern content blocks shape
    block_data = {
        "choices": [{
            "message": {
                "content": [
                    {"type": "image_url", "image_url": {"url": "https://cdn.example.com/modern.jpg"}}
                ]
            }
        }]
    }
    expect(
        service._extract_image_from_openrouter(block_data) == "https://cdn.example.com/modern.jpg",
        "extracts from modern content blocks",
    )

    # Freeform text content with embedded URL
    text_data = {
        "choices": [{
            "message": {
                "content": "Here is your generated artwork: https://cdn.example.com/art.webp Enjoy!"
            }
        }]
    }
    expect(
        service._extract_image_from_openrouter(text_data) == "https://cdn.example.com/art.webp",
        "extracts URL from text block",
    )


def test_placeholder_image_fallback():
    """Placeholder generator formats safe URL with sanitized prompt."""
    service = ImageService()
    url = service._placeholder_image("a neon synthwave city at night")
    expect(url.startswith("https://placehold.co/1024x1024/"), "valid placehold.co prefix")
    expect("neon+synthwave" in url, "spaces converted to plus signs")
