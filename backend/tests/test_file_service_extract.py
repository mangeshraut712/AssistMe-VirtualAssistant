"""FileService.extract_text must read real PDFs with the pinned pypdf major."""
import asyncio

import pytest

from app.services.file_service import FileService
from tests.support import expect

pytest.importorskip("pypdf")


def _one_page_pdf(text: str) -> bytes:
    """Build a minimal valid PDF whose single page draws `text` in Helvetica."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode()
    out += f"startxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


def test_extract_text_reads_a_pdf_page(tmp_path):
    """Text drawn on a PDF page comes back from extract_text."""
    path = tmp_path / "note.pdf"
    path.write_bytes(_one_page_pdf("Hello AssistMe"))
    text = asyncio.run(FileService().extract_text(str(path), "application/pdf"))
    expect("Hello AssistMe" in text, f"expected the page text, got {text!r}")


def test_extract_text_reports_a_broken_pdf_instead_of_raising(tmp_path):
    """A file that is not a PDF yields the error message, not an exception."""
    path = tmp_path / "broken.pdf"
    path.write_bytes(b"not a pdf at all")
    text = asyncio.run(FileService().extract_text(str(path), "application/pdf"))
    expect(text == "Error extracting PDF.", f"unexpected result {text!r}")


def test_extract_text_reads_plain_text(tmp_path):
    """text/* uploads are read as UTF-8, including a charset parameter."""
    path = tmp_path / "note.txt"
    path.write_text("plain body", encoding="utf-8")
    text = asyncio.run(FileService().extract_text(str(path), "text/plain; charset=utf-8"))
    expect(text == "plain body", f"unexpected result {text!r}")


def test_extract_text_raises_for_a_missing_file(tmp_path):
    """A path that does not exist raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        asyncio.run(FileService().extract_text(str(tmp_path / "gone.pdf"), "application/pdf"))
