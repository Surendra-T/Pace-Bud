# Pace-Bud

> **An offline-resilient, voice-activated micro-expedition generator designed to break screen inertia using open-weight AI.**

Pace-Bud is a fully open-source React/FastAPI application built for the Hacktoberfest 2026 "Touch Grass" challenge. It actively targets desk fatigue by calculating local daylight windows and generating spontaneous, time-sensitive outdoor routing dispatches. It features a decentralized, zero-signal audio queue, allowing runners to log field observations entirely offline, syncing only when network connectivity is restored.

---

## System Architecture & Features

1. **Astronomical Daylight Calculation:** Computes exact local sunset and remaining daylight minutes via ephemeris (`astral`), triggering time-sensitive dispatch windows.
2. **Open-Weight AI Dispatches:** Leverages Google's Gemma 2 9B (via local Ollama) to generate concise, location-aware outdoor objectives without relying on proprietary cloud LLM providers.
3. **Decentralized Audio Field Queue (Offline Mode):** Captures voice logs in zero-signal environments. Audio blobs are saved locally via browser `IndexedDB` (`idb-keyval`) and synced asynchronously when the device regains connectivity.
4. **Resilient Run Telemetry:** A decoupled timer built on timestamp offsets (`Date.now() - startTime`) combined with the Page Visibility API to accurately log "pocket time" versus "screen time," ensuring metrics survive app backgrounding.
5. **Cadence Integration:** Dual-mode Spotify support featuring a zero-auth embed or optional PKCE OAuth Web Playback SDK connection.
6. **Time-Series Analytics:** Logs pre- and post-run mood deltas against daylight exposure and biometric data (Apple Health CSV format) into MongoDB Atlas for visual correlation.

---

## Tech Stack

- **Backend:** Python 3.10+, FastAPI, Motor (Async MongoDB), Astral, Temporal SDK (optional workflow engine).
- **Inference:** Ollama (Gemma 2 9B), ElevenLabs TTS.
- **Frontend:** React 18, Vite, Tailwind CSS, Chart.js.
- **Database:** MongoDB Atlas (Time-Series).

---

## Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Ollama installed locally with `gemma2:9b` pulled.

### 2. Environment Configuration
Copy the template and configure your keys:
```bash
cp .env.example .env
Ensure your local Ollama endpoint is mapped:

Code snippet
DIGITALOCEAN_GEMMA_ENDPOINT=[http://127.0.0.1:11434/v1](http://127.0.0.1:11434/v1)
DIGITALOCEAN_API_KEY=ollama
GEMMA_MODEL=gemma2:9b
3. Backend Initialization
Initialize the virtual environment and seed the time-series database with historical run metrics:

Bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
4. Frontend Initialization
Bash
cd frontend
npm install
npm run dev
Navigate to http://localhost:5173.

Offline Audio Workflow (Temporal Engine)
For production deployments requiring robust retry logic for the offline audio queue, Temporal can be enabled.

Start the Temporal cluster: temporal server start-dev

Update .env: USE_TEMPORAL=true

Initialize the worker:

Bash
python backend/app/worker.py
Repository Verification
[x] Backend syntax & import validation

[x] Ephemeris calculation tests passing

[x] IndexedDB queue offline persistence verified

[x] Local LLM (Ollama) routing confirmed