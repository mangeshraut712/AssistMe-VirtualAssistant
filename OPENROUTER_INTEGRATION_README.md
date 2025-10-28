# OpenRouter API Integration

This document provides comprehensive instructions for setting up and using the robust OpenRouter API integration that allows dynamic model selection and switching.

## Overview

The integration has been completely redesigned to:
- **Dynamically fetch** all available models from OpenRouter API
- **Remove hardcoded defaults** for full flexibility
- **Implement intelligent caching** to avoid repeated API calls
- **Support automatic model switching** when primary models fail
- **Include comprehensive testing** with rate limiting protection
- **Provide detailed logging** and error handling

## Setup Process

### 1. Environment Configuration

Set the following environment variables in your `.env` or `secrets.env` file:

```bash
# Required: Your OpenRouter API key
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Optional: Custom API base URL (defaults to https://openrouter.ai/api/v1)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional: Default model (leave empty for full flexibility)
OPENROUTER_DEFAULT_MODEL=

# Optional: Fallback models (comma-separated)
OPENROUTER_FALLBACK_MODELS=meta-llama/llama-3.3-70b-instruct:free,google/gemini-2.0-flash-exp:free

# Optional: Request timeout in seconds (default: 60)
OPENROUTER_TIMEOUT=60

# Optional: Retry attempts for failed requests (default: 3)
OPENROUTER_RETRY_ATTEMPTS=3

# Optional: Retry backoff settings
OPENROUTER_RETRY_BACKOFF_BASE=1.0
OPENROUTER_RETRY_BACKOFF_MAX=12.0
OPENROUTER_RETRY_JITTER=0.25
```

### 2. Dependencies

Ensure the following Python packages are installed:

```bash
pip install requests
```

For production deployment, check `backend/requirements-production.txt`.

### 3. API Key Setup

1. Sign up for an OpenRouter account at [openrouter.ai](https://openrouter.ai)
2. Generate an API key from your dashboard
3. Add credits to your account (required for most models)
4. Set the `OPENROUTER_API_KEY` environment variable

## Features

### Dynamic Model Discovery

The integration automatically fetches all available models from OpenRouter:

```python
from backend.app.chat_client import grok_client

# Get all available models (fetched from API)
models = grok_client.get_available_models()
print(f"Found {len(models)} models")

# Each model includes: id, name, context_length, pricing
for model in models[:5]:
    print(f"- {model['name']} ({model['id']})")
```

### Intelligent Model Selection

Models are prioritized by:
1. **Requested model** (if specified)
2. **Configured default** (if set)
3. **Fallback models** (from environment)
4. **All available models** (sorted by context length)

### Automatic Fallback

When a model fails, the system automatically tries alternatives:

```python
# This will try the requested model first, then fallbacks
result = grok_client.generate_response(
    messages=[{"role": "user", "content": "Hello, world!"}],
    model="requested-model-id"
)

if "response" in result:
    print(f"Success with model: {result.get('model')}")
    print(result["response"])
else:
    print(f"Failed: {result.get('error')}")
```

### Caching System

Models are cached for 1 hour to reduce API calls:

```python
# First call fetches from API
models = grok_client.get_available_models()

# Subsequent calls use cache (for 1 hour)
models = grok_client.get_available_models()  # Instant response
```

### Streaming Support

The integration supports streaming responses:

```python
# Streaming response
for chunk in grok_client.generate_response_stream(
    messages=[{"role": "user", "content": "Tell me a story"}],
    model="meta-llama/llama-3.3-70b-instruct:free"
):
    if "content" in chunk:
        print(chunk["content"], end="", flush=True)
    elif chunk.get("done"):
        print(f"\nTokens used: {chunk.get('tokens')}")
        break
```

## Testing

### Comprehensive Model Testing

Run the full test suite to verify all models:

```bash
# Set your API key
export OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Run the comprehensive test
python scripts/test_openrouter_models.py
```

**What the test does:**
- Fetches all available models from OpenRouter
- Tests each model with "Hello, world!" query
- Measures latency and token usage
- Logs success/failure status
- Implements 3-minute delays between tests to prevent rate limiting
- Generates detailed JSON results and summary

### Test Output

The test generates:
- **Console output** with real-time progress
- **Log file** (`openrouter_model_test.log`) with detailed information
- **JSON results** (`openrouter_test_results.json`) for analysis

Example test summary:
```
OPENROUTER MODEL TEST SUMMARY
================================================================================
Total Models Tested: 346
Successful Tests: 289
Failed Tests: 57
Success Rate: 83.5%
Average Latency: 2.34 seconds
Total Duration: 45.2 minutes

FAILED MODELS:
  - Some Model: Rate limited
  - Another Model: Requires credits

TOP 5 FASTEST MODELS:
  1. Fast Model: 0.8s
  2. Quick Model: 1.2s
  ...
```

### Individual Model Testing

Test specific models:

```python
# Test a specific model
result = grok_client.generate_response(
    messages=[{"role": "user", "content": "Hello, world!"}],
    model="meta-llama/llama-3.3-70b-instruct:free",
    max_tokens=100
)

print(f"Success: {'response' in result}")
print(f"Response: {result.get('response', result.get('error'))}")
print(f"Tokens: {result.get('tokens', 0)}")
```

## Error Handling

### Common Error Types

1. **Rate Limiting (429)**
   - Automatic retry with backoff
   - Switches to alternative models
   - Logs rate limit events

2. **Authentication Errors**
   - Clear error messages for invalid API keys
   - Graceful fallback to mock responses in development

3. **Network Issues**
   - Exponential backoff retry logic
   - Connection pooling for performance
   - Timeout handling

4. **Model Unavailable**
   - Automatic fallback to alternative models
   - Prioritized model selection

### Error Response Format

```python
{
    "error": "Rate limited on meta-llama/llama-3.3-70b-instruct:free. Trying alternative model...",
    "status_code": 429,
    "model": "meta-llama/llama-3.3-70b-instruct:free",
    "should_retry": True,
    "rate_limited": True
}
```

## Rate Limiting Protection

The integration includes multiple layers of rate limiting protection:

1. **Request Spacing**: 3-minute delays between model tests
2. **Exponential Backoff**: For retry attempts
3. **Redis-based Limiting**: Optional daily request caps
4. **Connection Pooling**: Reuses connections for efficiency

## Development Mode

When `DEV_MODE=true`, the system uses mock responses:

```bash
export DEV_MODE=true
export OPENROUTER_API_KEY=dummy-key

# Will return mock responses without API calls
result = grok_client.generate_response([{"role": "user", "content": "Hello"}])
```

## Monitoring and Logging

### Log Files

- `openrouter_model_test.log`: Detailed test execution logs
- Application logs: Include model switching events and errors

### Key Metrics

Monitor these metrics for system health:
- Model fetch success rate
- Average response latency
- Fallback frequency
- Error rates by model

## Troubleshooting

### Common Issues

1. **"User not found" Error**
   - Check API key validity
   - Verify account has credits
   - Ensure API key has proper permissions

2. **Rate Limiting**
   - Increase delays between requests
   - Consider upgrading OpenRouter plan
   - Implement request queuing

3. **Model Not Available**
   - Check OpenRouter status page
   - Verify model ID is correct
   - Use fallback models

4. **Import Errors**
   - Ensure backend dependencies are installed
   - Check Python path configuration

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Run tests with verbose output
```

## API Reference

### Grok2Client Methods

- `get_available_models()`: Returns list of available models
- `generate_response(messages, model=None, temperature=0.7, max_tokens=1024)`: Generate response
- `generate_response_stream(...)`: Streaming response generation

### Model Object Structure

```python
{
    "id": "meta-llama/llama-3.3-70b-instruct:free",
    "name": "Meta Llama 3.3 70B Instruct",
    "context_length": 131072,
    "pricing": {
        "prompt": "0",
        "completion": "0"
    }
}
```

## Security Considerations

- Store API keys securely (never in code)
- Use environment variables for configuration
- Rotate API keys regularly
- Monitor API usage and costs
- Implement rate limiting on your application level

## Performance Optimization

- Model caching reduces API calls
- Connection pooling improves response times
- Intelligent fallback prevents complete failures
- Streaming support for large responses

## Future Enhancements

Potential improvements:
- Model performance scoring
- Cost-based model selection
- Geographic routing optimization
- Advanced caching strategies
- Real-time model availability monitoring

---

For additional support or questions, refer to the OpenRouter documentation at [openrouter.ai/docs](https://openrouter.ai/docs).