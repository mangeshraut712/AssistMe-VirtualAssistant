#!/bin/bash

# Load environment variables without breaking on spaces
if [ -f "../secrets.env" ]; then
    while IFS= read -r line; do
        # Skip comments and blank lines
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        key=${line%%=*}
        value=${line#*=}
        key=$(echo "$key" | xargs)   # trim whitespace around key
        # Strip surrounding quotes from value if present
        if [[ "$value" =~ ^\".*\"$ ]]; then
            value=${value:1:-1}
        elif [[ "$value" =~ ^\'.*\'$ ]]; then
            value=${value:1:-1}
        fi
        # Trim leading/trailing whitespace in value
        value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
        printf -v "$key" '%s' "$value"
        export "$key"
    done < "../secrets.env"
fi

# Set OpenRouter endpoint
API_BASE="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
if [[ "$API_BASE" == */chat/completions ]]; then
    API_URL="${API_BASE}"
else
    API_URL="${API_BASE%/}/chat/completions"
fi
API_KEY="$OPENROUTER_API_KEY"
TIMEOUT="${OPENROUTER_TIMEOUT:-30}"

if [ -z "$API_KEY" ]; then
    echo "❌ ERROR: OPENROUTER_API_KEY not set in secrets.env"
    exit 1
fi

# Test message
TEST_MESSAGE="Hello, this is a test to check if the model is working. Please respond with a simple greeting."

# Models to test
MODELS=(
    "google/gemini-2.0-flash-exp:free"
    "qwen/qwen3-coder:free"
    "tngtech/deepseek-r1t2-chimera:free"
    "microsoft/mai-ds-r1:free"
    "openai/gpt-oss-20b:free"
    "z-ai/glm-4.5-air:free"
    "meta-llama/llama-3.3-70b-instruct:free"
    "nvidia/nemotron-nano-9b-v2:free"
    "mistralai/mistral-nemo:free"
    "moonshotai/kimi-dev-72b:free"
)

echo "🚀 Testing 10 AI models via OpenRouter API..."
echo "Endpoint: $API_URL"
echo "Timeout: ${TIMEOUT}s"
echo "=================================================="

RESULTS=()

for i in "${!MODELS[@]}"; do
    MODEL="${MODELS[$i]}"
    INDEX=$((i + 1))

    echo ""
    echo "$INDEX. Testing $MODEL..."

    # Create JSON payload
    JSON_PAYLOAD=$(cat <<EOF
{
    "model": "$MODEL",
    "messages": [
        {
            "role": "user",
            "content": "$TEST_MESSAGE"
        }
    ],
    "max_tokens": 100,
    "temperature": 0.7
}
EOF
    )

    # Make the API call
    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -H "HTTP-Referer: ${APP_URL:-http://localhost:3000}" \
        -H "X-Title: ${APP_NAME:-AssistMe Virtual Assistant}" \
        --data "$JSON_PAYLOAD" \
        --max-time $TIMEOUT)

    # Check if curl succeeded
    CURL_EXIT_CODE=$?
    if [ $CURL_EXIT_CODE -ne 0 ]; then
        echo "   ❌ FAILED: Network error (curl exit code: $CURL_EXIT_CODE)"
        RESULTS+=("$MODEL: FAILED - Network error")
        continue
    fi

    # Check if response contains error
    if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error')
        PROVIDER=$(echo "$RESPONSE" | jq -r '.error.metadata.provider_name // empty')
        RAW_DETAIL=$(echo "$RESPONSE" | jq -r '.error.metadata.raw // empty')
        if [ -n "$PROVIDER" ]; then
            ERROR_MSG="$ERROR_MSG (provider: $PROVIDER)"
        fi
        if [ -n "$RAW_DETAIL" ]; then
            TRIMMED_RAW=$(echo "$RAW_DETAIL" | head -c 240 | tr -d '\n')
            ERROR_MSG="$ERROR_MSG – detail: $TRIMMED_RAW"
        fi
        echo "   ❌ FAILED: $ERROR_MSG"
        RESULTS+=("$MODEL: FAILED - $ERROR_MSG")
    elif echo "$RESPONSE" | jq -e '.choices[0].message.content' >/dev/null 2>&1; then
        CONTENT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content')
        TOKENS=$(echo "$RESPONSE" | jq -r '.usage.total_tokens // "?"')
        echo "   ✅ WORKING: Response received ($TOKENS tokens)"
        RESULTS+=("$MODEL: WORKING")
    else
        echo "   ❌ FAILED: Unexpected response format"
        echo "   Response: $RESPONSE"
        RESULTS+=("$MODEL: FAILED - Unexpected response")
    fi
done

echo ""
echo "=================================================="
echo "SUMMARY OF RESULTS:"
echo ""

WORKING_COUNT=0
FAILED_COUNT=0

for RESULT in "${RESULTS[@]}"; do
    if [[ $RESULT == *": WORK"* ]]; then
        ((WORKING_COUNT++))
    elif [[ $RESULT == *": FAILED"* ]]; then
        ((FAILED_COUNT++))
    fi
    echo "$RESULT"
done

echo ""
echo "Total Working: $WORKING_COUNT"
echo "Total Failed: $FAILED_COUNT"
echo "=================================================="
