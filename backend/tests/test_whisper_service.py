"""Whisper language detection follows the 20250625 mel-bin contract."""

import importlib
import tempfile
from types import SimpleNamespace

import anyio
import pytest

from app.services.whisper_service import WhisperService

whisper_module = importlib.import_module("app.services.whisper_service")


class _Mel:
    def __init__(self, n_mels):
        self.n_mels = n_mels
        self.device = None

    def to(self, device):
        self.device = device
        return self


def _install_whisper(monkeypatch, n_mels_seen):
    def log_mel_spectrogram(audio, n_mels=80, padding=0, device=None):
        n_mels_seen["audio"] = audio
        n_mels_seen["n_mels"] = n_mels
        n_mels_seen["padding"] = padding
        n_mels_seen["device"] = device
        return _Mel(n_mels)

    fake = SimpleNamespace(
        load_audio=lambda path: f"pcm:{path}",
        pad_or_trim=lambda audio: f"trimmed:{audio}",
        log_mel_spectrogram=log_mel_spectrogram,
        load_model=lambda name: SimpleNamespace(name=name),
    )
    monkeypatch.setattr(whisper_module, "whisper", fake)
    return fake


def test_large_v3_language_detection_requests_128_mel_bins(monkeypatch):
    seen = {}
    _install_whisper(monkeypatch, seen)
    detected = {}

    def detect_language(mel):
        detected["mel"] = mel
        return None, {"en": 0.2, "hi": 0.8}

    service = WhisperService(model_size="large-v3")
    service.model = SimpleNamespace(
        device="cpu",
        dims=SimpleNamespace(n_mels=128),
        detect_language=detect_language,
    )

    with tempfile.NamedTemporaryFile(suffix=".wav") as handle:
        language = service._detect_language_file(handle.name)

    assert language == "hi"
    assert seen["n_mels"] == 128
    assert seen["audio"].startswith("trimmed:pcm:")
    assert detected["mel"].n_mels == 128
    assert detected["mel"].device == "cpu"


def test_base_model_keeps_80_mel_bins(monkeypatch):
    seen = {}
    _install_whisper(monkeypatch, seen)
    service = WhisperService(model_size="base")
    service.model = SimpleNamespace(
        device="cpu",
        dims=SimpleNamespace(n_mels=80),
        detect_language=lambda mel: (None, {"en": 1.0}),
    )

    with tempfile.NamedTemporaryFile(suffix=".wav") as handle:
        assert service._detect_language_file(handle.name) == "en"

    assert seen["n_mels"] == 80


def test_transcribe_strips_text_and_deletes_the_temp_file(monkeypatch, tmp_path):
    audio_path = tmp_path / "clip.wav"
    captured = {}

    class _TempFile:
        name = str(audio_path)

        def write(self, data):
            audio_path.write_bytes(data)

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    monkeypatch.setattr(
        whisper_module.tempfile,
        "NamedTemporaryFile",
        lambda *args, **kwargs: _TempFile(),
    )

    def transcribe(path, language=None, task=None, fp16=None):
        captured.update(path=path, language=language, task=task, fp16=fp16)
        return {"text": "  hello world  ", "language": "en", "segments": [{"id": 0}]}

    service = WhisperService()
    service.model = SimpleNamespace(transcribe=transcribe)

    result = anyio.run(service.transcribe, b"RIFFdata", "en")

    assert result == {
        "text": "hello world",
        "language": "en",
        "segments": [{"id": 0}],
    }
    assert captured == {
        "path": str(audio_path),
        "language": "en",
        "task": "transcribe",
        "fp16": False,
    }
    assert audio_path.exists() is False


def test_transcribe_deletes_the_temp_file_when_decoding_fails(monkeypatch, tmp_path):
    audio_path = tmp_path / "clip.wav"

    class _TempFile:
        name = str(audio_path)

        def write(self, data):
            audio_path.write_bytes(data)

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    monkeypatch.setattr(
        whisper_module.tempfile,
        "NamedTemporaryFile",
        lambda *args, **kwargs: _TempFile(),
    )

    def fail_decode(*_args, **_kwargs):
        raise RuntimeError("decode failed")

    service = WhisperService()
    service.model = SimpleNamespace(transcribe=fail_decode)

    with pytest.raises(RuntimeError, match="decode failed"):
        anyio.run(service.transcribe, b"RIFFdata")

    assert audio_path.exists() is False


def test_missing_whisper_library_is_reported(monkeypatch):
    monkeypatch.setattr(whisper_module, "whisper", None)
    service = WhisperService()

    with pytest.raises(RuntimeError, match="not installed"):
        service._load_model()
