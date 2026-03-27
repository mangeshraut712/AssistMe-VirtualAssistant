<a id="top"></a>

<div align="center">

# AssistMe

### _Multi-modal AI assistant with voice, research, image, and diagnostics tools_

<img src="https://img.shields.io/badge/AssistMe-AI_Assistant-0EA5E9?style=for-the-badge&logo=probot&logoColor=white" alt="AssistMe badge" />
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=000000" alt="React badge" />
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite badge" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI badge" />
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python badge" />
<img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="MIT license badge" />

[Live Demo](https://assist-me-virtual-assistant.vercel.app/) • [Repository](https://github.com/mangeshraut712/AssistMe-VirtualAssistant) • [Issues](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/issues)

**[About](#about) • [Features](#features) • [Tech Stack](#tech-stack) • [Quick Start](#quick-start) • [Project Structure](#project-structure) • [Scripts](#scripts) • [License](#license) • [Contact](#contact)**

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [License](#license)
- [Contact](#contact)

---

<a id="about"></a>

## About

AssistMe is a React + FastAPI workspace that brings chat, voice, research, image generation, and network diagnostics into one polished assistant. The codebase is split into a Vite frontend, a Python backend, and small API helpers so the experience stays fast locally and easy to deploy.

<div align="center">

| Voice Mode | Deep Research | Multimodal Tools | Diagnostics |
| :-- | :-- | :-- | :-- |
| Real-time voice conversations | Grokipedia-style research flow | Image, file, and utility panels | Speedtest and benchmark views |

</div>

<a id="features"></a>

## Features

- Advanced Voice Mode with responsive interaction and audio-focused UI states.
- Grokipedia research flows that combine search, synthesis, and citations.
- Image generation, file upload, and assistant utility panels in a single shell.
- Speedtest Ultra for network checks and performance-oriented diagnostics.
- Multilingual support with a strong focus on Indian languages and scripts.

<a id="tech-stack"></a>

## Tech Stack

**Frontend**

- React 19
- Vite 7
- Tailwind CSS
- Framer Motion
- Radix UI primitives

**Backend**

- FastAPI
- Uvicorn
- Python 3
- Pydantic
- OpenRouter and Gemini integrations

**Tooling**

- ESLint
- Prettier
- npm-run-all
- Vercel deployment
- local validation scripts

<a id="quick-start"></a>

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+ with `venv`
- API keys for OpenRouter and any optional model providers you plan to use

### Install

```bash
git clone https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
cd AssistMe-VirtualAssistant
npm install
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Configure

Create `backend/.env` from `.env.example` and set the provider keys you need.

### Run

```bash
# Frontend development server
npm run dev

# Backend API
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

<a id="project-structure"></a>

## Project Structure

```text
AssistMe-VirtualAssistant/
├── src/                # React app, pages, components, hooks, and context
├── backend/            # FastAPI application, models, routes, and services
├── api/                # Serverless helpers and provider endpoints
├── public/             # Static assets and PWA manifest files
├── scripts/            # Validation and maintenance utilities
└── quick-start.sh      # Optional bootstrap helper
```

<a id="scripts"></a>

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend Vite dev server |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production build locally |
| `npm run start` | Run frontend + backend helper servers in parallel |
| `npm run backend:setup` | Create the backend virtual environment and install Python deps |
| `npm run lint` | Lint the frontend source |
| `npm run lint:fix` | Auto-fix lintable frontend issues |
| `npm run validate-paths` | Verify key project paths |

<a id="license"></a>

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

<a id="contact"></a>

## Contact

- Live demo: [assist-me-virtual-assistant.vercel.app](https://assist-me-virtual-assistant.vercel.app/)
- Repository issues: [mangeshraut712/AssistMe-VirtualAssistant/issues](https://github.com/mangeshraut712/AssistMe-VirtualAssistant/issues)

[↑ Back to Top](#top)
