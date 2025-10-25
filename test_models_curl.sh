#!/bin/bash

# Test all OpenRouter models against the Railway backend
# This tests the actual deployment that Vercel frontend will call

API_BASE="http://localhost:8001"
TEST_QUESTION="What is the capital of France? Please respond in exactly 2 sentences and include the population of the city."

# Model configurations (same as frontend)
declare -a MODELS=(
    "google/gemini-2.0-flash-exp:free,Google Gemini 2.0 Flash Experimental"
    "qwen/qwen3-coder:free,Qwen3 Coder 480B A35B"
    "tngtech/deepseek-r1t2-chimera:free,DeepSeek R1T2 Chimera"
    "microsoft/mai-ds-r1:free,Microsoft MAI DS R1"
    "openai/gpt-oss-20b:free,OpenAI GPT OSS 20B"
    "z-ai/glm-4.5-air:free,Zhipu GLM 4.5 Air"
    "meta-llama/llama-3.3-70b-instruct:free,Meta Llama 3.3 70B Instruct"
    "nvidia/nemotron-nano-9b-v2:free,NVIDIA Nemotron Nano 9B V2"
    "mistralai/mistral-nemo:free,Mistral Nemo"
    "moonshotai/kimi-dev-72b:free,MoonshotAI Kimi Dev 72B"
)

echo "🚀 Testing OpenRouter Models via Railway Backend"
echo "🌐 API Base: $API_BASE"
echo "📊 Testing ${#MODELS[@]} models with: '$TEST_QUESTION'"
echo "==========================================="

success_count=0
error_count=0
total_latency=0

for i in "${!MODELS[@]}"; do
    IFS=',' read -r model_id model_name <<< "${MODELS[i]}"
    echo -e "\n[$((i+1))/${#MODELS[@]}] 🔍 Testing: $model_name ($model_id)"

    # Prepare JSON payload
    payload=$(cat <<EOF
{
    "messages": [{"role": "user", "content": "$TEST_QUESTION"}],
    "model": "$model_id",
    "temperature": 0.7,
    "max_tokens": 150
}
EOF
)

    start_time=$(date +%s.%3N)

    # Make API call
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST "$API_BASE/api/chat/text" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        --connect-timeout 10 \
        --max-time 60)

    # Extract HTTP status and response body
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)
    response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')

    end_time=$(date +%s.%3N)
    latency=$(echo "scale=2; $end_time - $start_time" | bc 2>/dev/null || echo "N/A")

    if [[ "$http_status" == "200" ]]; then
        # Extract response from JSON
        response_text=$(echo "$response_body" | jq -r '.response // empty' 2>/dev/null)
        tokens=$(echo "$response_body" | jq -r '.usage.tokens // .tokens // 0' 2>/dev/null)

        if [[ -n "$response_text" && "$response_text" != "null" ]]; then
            echo "✅ Success (HTTP $http_status, ${latency}s, ${tokens:-0} tokens)"
            echo "📝 Response: $response_text"
            ((success_count++))
            if [[ "$latency" != "N/A" ]]; then
                total_latency=$(echo "scale=2; $total_latency + $latency" | bc)
            fi
        else
            echo "❌ No response content (HTTP $http_status, ${latency}s)"
            ((error_count++))
        fi
    else
        echo "❌ HTTP Error $http_status (${latency}s)"
        echo "Response: $response_body"
        ((error_count++))
    fi

    # Add delay between requests to avoid rate limiting
    sleep 2
done

echo -e "\n==========================================="
echo "📊 TESTING SUMMARY"
echo "✅ Successful: $success_count/${#MODELS[@]}"
if [[ $success_count -gt 0 ]]; then
    avg_latency=$(echo "scale=2; $total_latency / $success_count" | bc)
    echo "⏱️ Average latency: ${avg_latency}s"
fi

if [[ $error_count -gt 0 ]]; then
    echo "❌ Failed: $error_count models"
    echo -e "\n💡 Common issues:"
    echo "   • Rate limiting (45 free requests/day)"
    echo "   • Model temporarily unavailable"
    echo "   • Network/connectivity issues"
    echo "   • API credits exhausted"
fi

echo -e "\n✅ Testing complete! Results show if models are working for Vercel deployment."
