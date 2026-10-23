"""Whisper language detection follows the 20250625 mel-bin contract."""

import importlib
from types import SimpleNamespace

import anyio
import pytest

from app.services.whisper_service import WhisperService
from tests.support import expect

whisper_module = importlib.import_module("app.services.whisper_service")


class _Mel:
    """Stand-in for the log-mel tensor whisper returns."""

    def __init__(self, n_mels):
        self.n_mels = n_mels
        self.device = None

    def to(self, device):
        """Record the device and return this spectrogram."""
        self.device = device
        return self

    def describe(self):
        """Return the mel bin count and the device this spectrogram was moved to."""
        return self.n_mels, self.device


class _AudioFile:
    """Stand-in for NamedTemporaryFile that records audio on disk."""

    def __init__(self, path):
        self.name = str(path)
        self._path = path

    def write(self, data):
        """Store audio bytes where the service expects the temporary file."""
        self._path.write_bytes(data)
        self.flush()
        return len(data)

    def flush(self):
        """Finish the write so later reads see the audio bytes."""
        return None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


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


def _use_audio_file(monkeypatch, path):
    monkeypatch.setattr(
        whisper_module.tempfile,
        "NamedTemporaryFile",
        lambda *_args, **_kwargs: _AudioFile(path),
    )


def test_large_v3_language_detection_requests_128_mel_bins(monkeypatch):
    """large-v3 language detection asks whisper for 128 mel bins."""
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

    language = anyio.run(service.detect_language, b"RIFFdata")
    n_mels, device = detected["mel"].describe()

    expect(language == "hi", "highest probability language should win")
    expect(seen["n_mels"] == 128, "large-v3 should request 128 mel bins")
    expect(str(seen["audio"]).startswith("trimmed:pcm:"), "audio should be trimmed pcm")
    expect(n_mels == 128, "spectrogram should keep 128 bins")
    expect(device == "cpu", "spectrogram should move to the model device")


def test_base_model_keeps_80_mel_bins(monkeypatch):
    """The base model keeps the historical 80 mel bin setting."""
    seen = {}
    _install_whisper(monkeypatch, seen)
    service = WhisperService(model_size="base")
    service.model = SimpleNamespace(
        device="cpu",
        dims=SimpleNamespace(n_mels=80),
        detect_language=lambda mel: (None, {"en": 1.0}),
    )

    language = anyio.run(service.detect_language, b"RIFFdata")

    expect(language == "en", "base model should detect english")
    expect(seen["n_mels"] == 80, "base model should request 80 mel bins")


def test_transcribe_strips_text_and_deletes_the_temp_file(monkeypatch, tmp_path):
    """Transcription trims text and removes the temporary audio file."""
    audio_path = tmp_path / "clip.wav"
    captured = {}
    _use_audio_file(monkeypatch, audio_path)

    def transcribe(path, language=None, task=None, fp16=None):
        captured.update(path=path, language=language, task=task, fp16=fp16)
        return {"text": "  hello world  ", "language": "en", "segments": [{"id": 0}]}

    service = WhisperService()
    service.model = SimpleNamespace(transcribe=transcribe)

    result = anyio.run(service.transcribe, b"RIFFdata", "en")

    expect(
        result == {"text": "hello world", "language": "en", "segments": [{"id": 0}]},
        "transcription should strip surrounding whitespace",
    )
    expect(
        captured
        == {
            "path": str(audio_path),
            "language": "en",
            "task": "transcribe",
            "fp16": False,
        },
        "whisper should be called with the temp path and CPU-safe settings",
    )
    expect(audio_path.exists() is False, "temp audio should be deleted after success")


def test_transcribe_deletes_the_temp_file_when_decoding_fails(monkeypatch, tmp_path):
    """A decode error still removes the temporary audio file."""
    audio_path = tmp_path / "clip.wav"
    _use_audio_file(monkeypatch, audio_path)

    def fail_decode(*_args, **_kwargs):
        raise RuntimeError("decode failed")

    service = WhisperService()
    service.model = SimpleNamespace(transcribe=fail_decode)

    with pytest.raises(RuntimeError, match="decode failed"):
        anyio.run(service.transcribe, b"RIFFdata")

    expect(audio_path.exists() is False, "temp audio should be deleted after failure")


def test_missing_whisper_library_is_reported(monkeypatch):
    """Transcription reports a clear error when whisper is not installed."""
    monkeypatch.setattr(whisper_module, "whisper", None)
    service = WhisperService()

    with pytest.raises(RuntimeError, match="not installed"):
        anyio.run(service.transcribe, b"RIFFdata")
