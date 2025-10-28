import base64
import sys
from pathlib import Path

# Ensure repository backend directory is on sys.path for CI compatibility
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import (
    _apply_personalisation,
    _decode_base64_audio,
    _serialise_intermediate_steps,
)


class DummyAction:
    def __init__(self, tool=None, tool_input=None, log=None):
        self.tool = tool
        self.tool_input = tool_input
        self.log = log


def test_serialise_intermediate_steps_handles_agent_actions():
    steps = [(DummyAction(tool="search", tool_input="langchain", log="search"), "found result")]
    serialised = _serialise_intermediate_steps(steps)
    assert serialised[0]["action"] == "search"
    assert serialised[0]["input"] == "langchain"
    assert serialised[0]["observation"] == "found result"


def test_decode_base64_audio_handles_invalid_payload():
    assert _decode_base64_audio(None) is None
    assert _decode_base64_audio("not-base64") is None
    data = base64.b64encode(b"audio-bytes").decode()
    assert _decode_base64_audio(data) == b"audio-bytes"


def test_apply_personalisation_injects_system_prompt():
    messages = [{"role": "user", "content": "Hi there"}]
    prefs = {"style": "concise", "language": "en"}
    personalised = _apply_personalisation(messages, prefs)
    assert personalised[0]["role"] == "system"
    assert "concise" in personalised[0]["content"].lower()
    assert personalised[-1]["role"] == "user"
