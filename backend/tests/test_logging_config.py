"""Regression coverage for the standard-library logging fallback."""

import logging

from app import logging_config


def test_stdlib_logging_fallback_keeps_structured_fields(monkeypatch, caplog):
    """The no-structlog fallback must not pass unsupported kwargs to Logger."""
    logger_name = "assistme-test-stdlib-logging"
    plain_logger = logging.getLogger(logger_name)
    plain_logger.handlers.clear()

    monkeypatch.setattr(logging_config, "STRUCTLOG_AVAILABLE", False)
    fallback = logging_config.setup_logging(service_name=logger_name)

    with caplog.at_level(logging.INFO, logger=logger_name):
        fallback.info("request complete", request_id="test-request", status="success")

    record = caplog.records[-1]
    assert record.getMessage() == "request complete"
    assert record.request_id == "test-request"
    assert record.status == "success"
