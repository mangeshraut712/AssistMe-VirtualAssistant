"""Utilities for compressing large text blocks into image representations.

The goal is to reduce LLM token pressure by rendering chunks of text into
lightweight PNG images that can be passed to vision-capable models.
"""

from __future__ import annotations

import base64
import io
import math
import textwrap
from dataclasses import dataclass
from typing import Iterable, List, Optional

try:
    from PIL import Image, ImageDraw, ImageFont  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional runtime dependency
    Image = ImageDraw = ImageFont = None  # type: ignore[assignment]

DEFAULT_FONT = "DejaVuSans.ttf"
FALLBACK_FONT_SIZE = 20


@dataclass
class RenderedPage:
    """Represents a single rendered text page."""

    text: str
    image_b64: str
    width: int
    height: int


def ensure_pillow_available() -> None:
    if Image is None or ImageDraw is None or ImageFont is None:
        raise RuntimeError("Pillow is required for text-to-image compression. Install the 'Pillow' package.")


def chunk_text(text: str, *, max_chars: int = 800, overlap: int = 0) -> List[str]:
    """Split text into chunks respecting word boundaries."""
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")

    words = text.split()
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for word in words:
        word_len = len(word) + 1  # include space
        if current and current_len + word_len > max_chars:
            chunk_text = " ".join(current)
            chunks.append(chunk_text)
            if overlap > 0:
                overlap_words = current[-overlap:]
                current = overlap_words[:]
                current_len = sum(len(w) + 1 for w in current)
            else:
                current = []
                current_len = 0
        current.append(word)
        current_len += word_len

    if current:
        chunks.append(" ".join(current))

    return chunks


def _load_font(font_size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(DEFAULT_FONT, font_size)  # type: ignore[arg-type]
    except Exception:  # pragma: no cover - font availability varies
        return ImageFont.load_default()


def render_chunk_to_image(
    text_chunk: str,
    *,
    width: int = 1024,
    padding: int = 48,
    font_size: int = FALLBACK_FONT_SIZE,
    bg_color: str = "#ffffff",
    text_color: str = "#111111",
    line_spacing: float = 1.4,
) -> RenderedPage:
    """Render a chunk of text into a base64-encoded PNG image."""

    ensure_pillow_available()
    font = _load_font(font_size)

    draw = ImageDraw.Draw(Image.new("RGB", (width, 10)))
    max_line_width = width - padding * 2
    words = text_chunk.split()
    lines: List[str] = []
    current_line: List[str] = []

    for word in words:
        tentative = " ".join(current_line + [word]) if current_line else word
        line_width = draw.textlength(tentative, font=font)
        if line_width <= max_line_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))

    line_height = font.size * line_spacing
    height = int(padding * 2 + math.ceil(len(lines) * line_height))
    image = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(image)

    y = padding
    for line in lines:
        draw.text((padding, y), line, fill=text_color, font=font)
        y += line_height

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")

    return RenderedPage(text=text_chunk, image_b64=encoded, width=width, height=height)


def compress_text_to_images(
    text: str,
    *,
    max_chars: int = 800,
    overlap: int = 0,
    width: int = 1024,
    padding: int = 48,
    font_size: int = FALLBACK_FONT_SIZE,
    bg_color: str = "#ffffff",
    text_color: str = "#111111",
) -> List[RenderedPage]:
    """Convert large text into a list of rendered pages."""
    ensure_pillow_available()
    chunks = chunk_text(text, max_chars=max_chars, overlap=overlap)
    return [
        render_chunk_to_image(
            chunk,
            width=width,
            padding=padding,
            font_size=font_size,
            bg_color=bg_color,
            text_color=text_color,
        )
        for chunk in chunks
    ]
