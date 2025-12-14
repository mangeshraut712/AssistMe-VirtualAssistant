"""
Application Configuration using Pydantic Settings (2025 Best Practice)

This module provides type-safe, validated configuration with:
- Environment variable loading
- .env file support
- Validation at startup
- Computed properties
- Caching for performance
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Literal

from pydantic import Field, computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    """Database configuration."""

    model_config = SettingsConfigDict(
        env_prefix="",
        extra="ignore",
    )

    # Primary database URL
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    railway_database_url: str | None = Field(default=None, alias="RAILWAY_DATABASE_URL")

    # Railway Postgres individual vars
    pg_host: str | None = Field(default=None, alias="PGHOST")
    pg_user: str | None = Field(default=None, alias="PGUSER")
    pg_password: str | None = Field(default=None, alias="PGPASSWORD")
    pg_database: str | None = Field(default=None, alias="PGDATABASE")
    pg_port: int = Field(default=5432, alias="PGPORT")

    # Pool settings
    pool_size: int = Field(default=5, ge=1, le=20)
    pool_max_overflow: int = Field(default=10, ge=0, le=30)
    pool_timeout: int = Field(default=30, ge=5, le=120)

    @computed_field
    @property
    def url(self) -> str | None:
        """Resolve the final database URL with proper driver."""
        # Check explicit URLs first
        for url in [self.database_url, self.railway_database_url]:
            if url:
                return self._normalize_url(url)

        # Build from individual PG vars
        if all([self.pg_host, self.pg_user, self.pg_password, self.pg_database]):
            return (
                f"postgresql+psycopg://{self.pg_user}:{self.pg_password}"
                f"@{self.pg_host}:{self.pg_port}/{self.pg_database}"
            )

        # Dev mode fallback
        if os.getenv("DEV_MODE", "false").lower() == "true":
            return "sqlite:///./assistme.db"

        # Local docker-compose fallback (only if not on Railway)
        if os.getenv("RAILWAY_PROJECT_ID") is None:
            return "postgresql+psycopg://assistme_user:assistme_password@db:5432/assistme_db"

        return None

    def _normalize_url(self, url: str) -> str:
        """Ensure SQLAlchemy-compatible URL format."""
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        if url.startswith("postgresql://") and "+" not in url.split("://")[0]:
            return url.replace("postgresql://", "postgresql+psycopg://", 1)

        return url


class RedisSettings(BaseSettings):
    """Redis configuration."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")
    redis_max_connections: int = Field(default=10, ge=1, le=50)
    redis_decode_responses: bool = True
    redis_socket_timeout: float = 5.0


class AISettings(BaseSettings):
    """AI Provider configuration."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        alias="OPENROUTER_BASE_URL"
    )
    default_model: str = Field(
        default="x-ai/grok-3-mini-beta",
        alias="DEFAULT_MODEL"
    )
    default_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    default_max_tokens: int = Field(default=4096, ge=1, le=128000)

    # Rate limiting
    requests_per_minute: int = Field(default=60, ge=1, le=1000)
    tokens_per_minute: int = Field(default=100000, ge=1000)

    @computed_field
    @property
    def is_configured(self) -> bool:
        """Check if AI provider is properly configured."""
        return bool(self.openrouter_api_key)


class SecuritySettings(BaseSettings):
    """Security and authentication configuration."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        alias="SECRET_KEY",
        min_length=16,
    )
    algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60 * 24 * 7,  # 7 days
        alias="ACCESS_TOKEN_EXPIRE_MINUTES",
        ge=5,
        le=60 * 24 * 30,  # Max 30 days
    )

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        alias="CORS_ORIGINS",
    )
    cors_allow_credentials: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v or []


class LoggingSettings(BaseSettings):
    """Logging configuration."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        alias="LOG_LEVEL",
    )
    log_format: Literal["json", "console"] = Field(
        default="console",
        alias="LOG_FORMAT",
    )
    log_include_timestamp: bool = True


class AppSettings(BaseSettings):
    """Main application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App metadata
    app_name: str = Field(default="AssistMe Virtual Assistant", alias="APP_NAME")
    app_version: str = Field(default="3.0.0", alias="APP_VERSION")
    debug: bool = Field(default=False, alias="DEBUG")
    dev_mode: bool = Field(default=False, alias="DEV_MODE")

    # Environment
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        alias="ENVIRONMENT",
    )

    # Sub-configurations
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    ai: AISettings = Field(default_factory=AISettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)

    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "AppSettings":
        """Validate that production has proper configuration."""
        if self.is_production:
            if self.security.secret_key == "dev-secret-key-change-in-production":
                raise ValueError("Production requires a proper SECRET_KEY")
            if not self.ai.is_configured:
                # Warning instead of error - can run without AI
                pass
        return self


@lru_cache
def get_settings() -> AppSettings:
    """Get cached application settings.

    Uses lru_cache to ensure settings are only loaded once.
    """
    return AppSettings()


# Convenience accessors
settings = get_settings()
