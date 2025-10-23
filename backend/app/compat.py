"""Runtime compatibility helpers for the AssistMe backend."""

from __future__ import annotations

import inspect
import sys
import typing


def _patch_forward_ref_evaluate() -> None:
    """Ensure typing.ForwardRef._evaluate works with Python 3.13.

    Python 3.13 made ``recursive_guard`` a keyword-only argument. Pydantic 1.x
    still calls the method positionally which raises a ``TypeError``. This shim
    widens the signature so older call sites continue to work.
    """
    if sys.version_info < (3, 13):
        return

    forward_ref = typing.ForwardRef  # type: ignore[attr-defined]
    original = getattr(forward_ref, "_evaluate", None)
    if original is None:
        return

    signature = inspect.signature(original)
    type_params_param = signature.parameters.get("type_params")
    recursive_guard_param = signature.parameters.get("recursive_guard")
    if not recursive_guard_param:
        return

    # Only patch if the parameter is keyword-only so we do not interfere with
    # alternate Python implementations that keep the positional variant.
    if recursive_guard_param.kind is not inspect.Parameter.KEYWORD_ONLY:
        return

    type_params_default = None
    if type_params_param is not None:
        type_params_default = type_params_param.default

    def _evaluate(self, globalns, localns, type_params=type_params_default, recursive_guard=None):
        if recursive_guard is None:
            recursive_guard = set()
        if type_params_param is None or type_params is type_params_default:
            return original(self, globalns=globalns, localns=localns, recursive_guard=recursive_guard)
        return original(
            self,
            globalns=globalns,
            localns=localns,
            type_params=type_params,
            recursive_guard=recursive_guard,
        )

    forward_ref._evaluate = _evaluate  # type: ignore[attr-defined]


_patch_forward_ref_evaluate()
