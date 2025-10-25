#!/usr/bin/env python3
"""
Test script to evaluate all available OpenRouter models with the same question.
"""

import os
import time
import sys
from dotenv import load_dotenv

# Load environment variables from secrets.env
load_dotenv('secrets.env')

# Set Python path to include backend
sys.path.append('backend')

try:
    from backend.app.chat_client import grok_client
    print("✓ Successfully imported chat client")
except ImportError as e:
    print(f"✗ Failed to import chat client: {e}")
    sys.exit(1)

# Test question for all models
TEST_QUESTION = "What is the capital of France? Please respond in exactly 2 sentences and include the population of the city."
TEST_MESSAGES = [{"role": "user", "content": TEST_QUESTION}]

# All available models from the frontend configuration
MODEL_OPTIONS = [
    {"id": "google/gemini-2.0-flash-exp:free", "name": "Google Gemini 2.0 Flash Experimental"},
    {"id": "qwen/qwen3-coder:free", "name": "Qwen3 Coder 480B A35B"},
    {"id": "tngtech/deepseek-r1t2-chimera:free", "name": "DeepSeek R1T2 Chimera"},
    {"id": "microsoft/mai-ds-r1:free", "name": "Microsoft MAI DS R1"},
    {"id": "openai/gpt-oss-20b:free", "name": "OpenAI GPT OSS 20B"},
    {"id": "z-ai/glm-4.5-air:free", "name": "Zhipu GLM 4.5 Air"},
    {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Meta Llama 3.3 70B Instruct"},
    {"id": "nvidia/nemotron-nano-9b-v2:free", "name": "NVIDIA Nemotron Nano 9B V2"},
    {"id": "mistralai/mistral-nemo:free", "name": "Mistral Nemo"},
    {"id": "moonshotai/kimi-dev-72b:free", "name": "MoonshotAI Kimi Dev 72B"},
]

def print_separator():
    print("\n" + "="*80 + "\n")

def test_model(model_info):
    model_id = model_info["id"]
    model_name = model_info["name"]

    print(f"🔍 Testing: {model_name} ({model_id})")
    print(f"Question: {TEST_QUESTION}")

    try:
        start_time = time.time()

        response = grok_client.generate_response(
            messages=TEST_MESSAGES,
            model=model_id,
            temperature=0.7,
            max_tokens=150  # Limit response length for comparison
        )

        latency = round(time.time() - start_time, 2)

        if "error" in response:
            print(f"❌ Error: {response['error']}")
            return {"model": model_name, "status": "error", "error": response["error"], "latency": latency}

        tokens = response.get("tokens", 0)
        answer = response.get("response", "").strip()

        print(f"⏱️ Latency: {latency}s | Tokens: {tokens}")
        print(f"📝 Response: {answer}")

        return {
            "model": model_name,
            "status": "success",
            "response": answer,
            "latency": latency,
            "tokens": tokens
        }

    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return {"model": model_name, "status": "exception", "error": str(e)}

def main():
    print("🚀 Starting OpenRouter Model Testing")
    print(f"🔑 API Key configured: {'✓' if os.getenv('OPENROUTER_API_KEY') else '✗'}")
    print(f"🌐 API Base URL: {os.getenv('OPENROUTER_BASE_URL', 'default')}")
    print(f"⏰ Timeout: {os.getenv('OPENROUTER_TIMEOUT', '60')} seconds")
    print(f"📊 Testing {len(MODEL_OPTIONS)} models with: '{TEST_QUESTION}'")
    print_separator()

    results = []

    for i, model_info in enumerate(MODEL_OPTIONS, 1):
        print(f"[{i}/{len(MODEL_OPTIONS)}]")
        result = test_model(model_info)
        results.append(result)
        print_separator()
        time.sleep(1)  # Brief pause between requests to avoid rate limiting

    # Summary
    print("📊 TESTING SUMMARY")
    print("-" * 50)

    success_count = 0
    error_count = 0
    total_latency = 0.0

    for result in results:
        if result["status"] == "success":
            success_count += 1
            total_latency += result.get("latency", 0)
            print(f"✅ {result['model']}: {result.get('latency', 0)}s")
        else:
            error_count += 1
            error_msg = result.get("error", "unknown error")
            print(f"❌ {result['model']}: {error_msg}")

    avg_latency = total_latency / max(success_count, 1)

    print(f"\n📈 Results: {success_count}/{len(MODEL_OPTIONS)} successful")
    print(f"⏱️ Average latency: {round(avg_latency, 2)} seconds")
    print(f"💡 Rate limit: ~45 free requests/day across all models")

    if error_count > 0:
        print(f"\n⚠️ {error_count} models failed. This could be due to:")
        print("   - Rate limiting (45 requests/day free tier)")
        print("   - Model temporarily unavailable")
        print("   - API connectivity issues")
        print("   - Insufficient credits (shouldn't apply to free models)")

if __name__ == "__main__":
    main()
