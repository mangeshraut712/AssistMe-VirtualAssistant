# Deployment & Configuration Summary

## Status: ✅ Fully Deployed & Operational
- **Live URL:** https://assist-me-virtual-assistant.vercel.app/
- **API Health:** Verified (Status 200 OK)
- **CI Pipeline:** Passing (Node 20.x, Minimal Dependencies)

## Recent Fixes

### 1. Vercel Deployment ("Internal Server Error" & "Function Runtimes")
- **Root Cause:** Misconfigured `vercel.json` functions block and missing files in `src/lib`.
- **Fix:** 
  - Simplified `vercel.json` to rely on file-level config.
  - Removed `lib/` from `.gitignore` to correctly deploy `src/lib/apiClient.js` and `utils.js`.
  - Pinned `package.json` to `node: "20.x"` to match Vercel environment.

### 2. CI/CD Pipeline Failures
- **Root Cause:** Heavy ML dependencies (`faiss`, `whisper`) crashing the build and `package-lock.json` sync issues.
- **Fix:**
  - Created `backend/requirements-ci.txt` with minimal dependencies for validation.
  - Updated workflows to use `npm install` for reliability.
  - Made backend service imports conditional to pass validation without ML libraries.

### 3. Grokipedia & Model Fallback
- **Configuration:** Updated Grokipedia to request `x-ai/grok-4.1-fast`.
- **Reliability:** Implemented a smart fallback system in `api/chat.js`.
  - **Behavior:** If the primary model fails (e.g., 402 Insufficient Credits, 429 Rate Limit), the system automatically retries with free models (Llama 3.3, Nemotron, etc.).
  - **Result:** Ensures the app always provides an answer, even if the user's specific model request is rejected by the provider.

## Environment Variables
Ensure these are set in Vercel:
- `OPENROUTER_API_KEY`: Required for chat functionality.
- `AI_GATEWAY_API_KEY`: Optional, alternative provider.

## Quick Links
- [Health Check](https://assist-me-virtual-assistant.vercel.app/api/health)
- [Chat API](https://assist-me-virtual-assistant.vercel.app/api/chat/text)
