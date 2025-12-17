"""
Rate Limiting Service for AssistMe
Tracks API usage and enforces rate limits to prevent exceeding credits
"""

import asyncio
import logging
import os
import time
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class RateLimitService:
    def __init__(self):
        # Rate limits (requests per minute)
        self.requests_per_minute = int(os.getenv("RATE_LIMIT_RPM", "60"))
        self.requests_per_hour = int(os.getenv("RATE_LIMIT_RPH", "1000"))

        # Credit limits
        self.max_credits = float(os.getenv("MAX_CREDITS", "10.0"))
        self.current_credits = self.max_credits

        # Tracking
        self.minute_requests = []
        self.hour_requests = []
        self.lock = asyncio.Lock()

        # Cost tracking per model (approximate costs) – OpenRouter-only
        self.model_costs = {
            "google/gemini-2.0-flash": 0.0004,  # $0.40 / 1M output, approx per 1k
            "meta-llama/llama-3.3-70b-instruct:free": 0.0,
            "openai/gpt-oss-20b:free": 0.0,
            "mistralai/mistral-nemo:free": 0.0,
            "qwen/qwen-3-coder-480b-a35b": 0.0002,
            "x-ai/grok-4-fast": 0.0006,
        }

        logger.info(
            f"Rate limit service initialized: {self.requests_per_minute} RPM, {self.requests_per_hour} RPH, ${self.max_credits} credits")

    async def check_rate_limit(self) -> tuple[bool, str]:
        """Check if request is within rate limits."""
        async with self.lock:
            now = time.time()

            # Clean old requests
            self.minute_requests = [t for t in self.minute_requests if now - t < 60]
            self.hour_requests = [t for t in self.hour_requests if now - t < 3600]

            # Check rate limits
            if len(self.minute_requests) >= self.requests_per_minute:
                return False, f"Rate limit exceeded: {self.requests_per_minute} requests per minute"

            if len(self.hour_requests) >= self.requests_per_hour:
                return False, f"Rate limit exceeded: {self.requests_per_hour} requests per hour"

            return True, ""

    async def check_credits(self, model: str, estimated_tokens: int = 1000) -> tuple[bool, str]:
        """Check if request would exceed credit limits."""
        cost_per_token = self.model_costs.get(model, 0.0001)  # Default small cost
        estimated_cost = cost_per_token * (estimated_tokens / 1000)

        if self.current_credits - estimated_cost < 0:
            return False, f"Insufficient credits. Current: ${self.current_credits:.4f}, Required: ${estimated_cost:.4f}"

        return True, ""

    async def record_request(self, model: str, tokens_used: int = 0):
        """Record a completed request for rate limiting."""
        async with self.lock:
            now = time.time()
            self.minute_requests.append(now)
            self.hour_requests.append(now)

            # Deduct credits
            cost_per_token = self.model_costs.get(model, 0.0001)
            cost = cost_per_token * (tokens_used / 1000)
            self.current_credits -= cost

            logger.info(
                f"Request recorded: {model}, tokens: {tokens_used}, cost: ${cost:.6f}, credits remaining: ${self.current_credits:.4f}")

    async def get_status(self) -> Dict:
        """Get current rate limit and credit status."""
        async with self.lock:
            now = time.time()

            # Clean old requests for accurate counts
            current_minute_requests = len([t for t in self.minute_requests if now - t < 60])
            current_hour_requests = len([t for t in self.hour_requests if now - t < 3600])

            return {
                "requests_this_minute": current_minute_requests,
                "requests_per_minute_limit": self.requests_per_minute,
                "requests_this_hour": current_hour_requests,
                "requests_per_hour_limit": self.requests_per_hour,
                "current_credits": round(self.current_credits, 4),
                "max_credits": self.max_credits,
                "credit_usage_percent": round((1 - self.current_credits / self.max_credits) * 100, 2),
            }

    def reset_credits(self, amount: Optional[float] = None):
        """Reset credits (for testing or manual adjustment)."""
        self.current_credits = amount if amount is not None else self.max_credits
        logger.info(f"Credits reset to ${self.current_credits}")


# Global instance
rate_limit_service = RateLimitService()
