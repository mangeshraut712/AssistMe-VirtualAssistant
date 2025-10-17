## AssistMe × Grok‑2 & Google S2R Solo Roadmap

This blueprint turns the original multi-team roadmap into a realistic sequence for a **single developer** working iteratively from the current Vercel app toward a Grok‑2 + Speech-to-Retrieval platform. Each phase ends with a working milestone before moving on.

---

### Phase 0 – Stabilise Current App
1. Audit existing Vercel deployment, serverless endpoints, and API keys.
2. Add lightweight monitoring (Vercel analytics, simple logging to console).
3. Document current features and limitations.

✅ **Milestone:** Current AssistMe app is stable, documented, and reproducible.

---

### Phase 1 – Prep the Stack
1. **Research & Licensing**
   - Request access to xAI Grok‑2 weights on Hugging Face.
   - Review Google S2R paper; identify required audio datasets and encoders.
2. **Local Tooling**
   - Install CUDA toolkit, Docker, and NVIDIA Container Toolkit on a development GPU machine (cloud or local).
   - Create a mono-repo structure: `apps/frontend`, `apps/api`, `services/llm`, `services/s2r`.
3. **Infrastructure Boilerplate**
   - Draft docker-compose that runs PostgreSQL + Redis locally.
   - Write Terraform skeleton for GPU instance provisioning (optional, can use manual setup initially).

✅ **Milestone:** Repository supports containerised services and GPU experimentation.

---

### Phase 2 – Core Backend Prototype
1. Scaffold a FastAPI service (`apps/api`) with `/health` endpoint.
2. Spin up PostgreSQL; create migration scripts for `users`, `conversations`, `messages`.
3. Implement `/api/chat/text` that echoes a stub response while logging payloads.
4. Package service with Docker; confirm it runs locally alongside DB/Redis.

✅ **Milestone:** FastAPI backend responds to text chat requests and persists conversations.

---

### Phase 3 – Frontend Migration
1. Create a new Next.js 14 project (`apps/frontend`) mirroring current AssistMe UI.
2. Port existing HTML/CSS/JS into React components, maintaining feature parity.
3. Integrate Tailwind CSS and Zustand for state management.
4. Wire API calls to the Phase 2 backend (still stubbed responses).
5. Deploy the new frontend to Vercel (or a staging environment) while keeping production on the legacy app until feature complete.

✅ **Milestone:** Next.js front-end replicates current AssistMe functionality against the new API stub.

---

### Phase 4 – Grok‑2 Inference Service
1. Launch a GPU instance; pull Grok‑2 weights.
2. Configure SGLang or vLLM; expose streaming `/generate`.
3. Build a Python client inside the FastAPI project to proxy requests.
4. Replace stubbed `/api/chat/text` response with live Grok‑2 output (text-only).

✅ **Milestone:** Text chat uses Grok‑2 end-to-end.

---

### Phase 5 – Persistence & History
1. Extend DB schema with `sessions`, `messages` tables.
2. Persist each user turn and Grok response.
3. Implement API endpoints for fetching session lists and histories.
4. Update frontend to show previous conversations, restore on reload.

✅ **Milestone:** Chat history is stored and retrievable.

---

### Phase 6 – Voice Foundations
1. Add microphone capture in Next.js (Web Audio API) with PCM chunking.
2. Implement WebSocket route `/api/chat/voice` accepting audio frames.
3. Inside FastAPI, buffer audio to disk and return a simple acknowledgement.
4. Add TTS playback placeholder (e.g., using browser speech synthesis) to verify loop.

✅ **Milestone:** Voice input pipeline exists from browser to backend (no S2R yet).

---

### Phase 7 – Speech-to-Retrieval Service
1. Select / pretrain an audio encoder (e.g., HuBERT or Whisper encoder).
2. Build `services/s2r` Python module:
   - Convert incoming PCM → embeddings.
   - Store knowledge corpus in vector DB (Pinecone or local FAISS for start).
   - Implement intent ranking and retrieval result payload.
3. Expose gRPC/REST/WebSocket interface from S2R service.
4. Integrate with FastAPI voice endpoint:
   - For each audio chunk, obtain top intent/context snippets.
   - Fall back to Whisper transcription when confidence is low.

✅ **Milestone:** Voice endpoint returns inferred intent + context snippets.

---

### Phase 8 – Unified Orchestration
1. Assemble S2R output + retrieved context into Grok‑2 prompt template.
2. Stream Grok‑2 responses back to client via WebSockets/SSE.
3. Add high-quality TTS (Coqui/ElevenLabs) to return audio responses.
4. Update frontend voice flow to display partial intents, final answer, and play TTS.

✅ **Milestone:** Full voice conversation path operational (audio in → Grok‑2 text → TTS audio out).

---

### Phase 9 – Polish & Production
1. Implement authentication (magic link or OAuth) and rate limiting.
2. Add admin dashboard for monitoring active sessions and GPU load.
3. Integrate Prometheus + Grafana (or lightweight alternatives) for metrics.
4. Harden error handling, retries, logging, and secret management.
5. Containerise all services; deploy via Kubernetes or compose-based setup.

✅ **Milestone:** Production-ready mono-repo with automated deploy path.

---

### Phase 10 – Continuous Improvement
1. Optimise Grok‑2 with quantisation or speculative decoding if latency is high.
2. Experiment with multi-turn memory sharing between text and voice sessions.
3. Add optional plugins (weather, documents) using tool invocation.
4. Improve accessibility, localisation, and device compatibility.

✅ **Milestone:** AssistMe evolves beyond MVP with ongoing enhancements.

---

### Quick Reference Checklist

- [ ] Stabilise current deployment (Phase 0)
- [ ] Prepare repo + tooling for multi-service work (Phase 1)
- [ ] FastAPI backend with persistence (Phase 2)
- [ ] Next.js frontend parity (Phase 3)
- [ ] Grok‑2 inference integration (Phase 4)
- [ ] Conversation history (Phase 5)
- [ ] Basic voice pipeline (Phase 6)
- [ ] Functional S2R service (Phase 7)
- [ ] Grok‑2 + S2R orchestration with TTS (Phase 8)
- [ ] Security, observability, deployment (Phase 9)
- [ ] Ongoing improvements (Phase 10)

This step-by-step plan keeps work serial and achievable for one developer while ensuring the project remains functional at the end of every phase.
