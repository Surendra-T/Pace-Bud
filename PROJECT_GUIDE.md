# Pace-Bud — Complete End-to-End Project Architecture & Guide

> **What it is**: Pace-Bud is a mindful outdoor running companion designed for desk workers. It frees people from screen fatigue by nudging them outside into natural daylight, calculating exact sunset windows, delivering calm John Wick & Concierge voice dispatches, tracking outdoor stride with a never-pausing timer, and recording offline field voice logs.

---

## 1. Executive Overview: What, Where & Why

| Component / Feature | What Is Used? | Where In Codebase? | Why / What Does It Do? |
|---|---|---|---|
| **Web Server & REST API** | FastAPI, Uvicorn | `backend/app/main.py`, `backend/app/api/routes.py` | Provides fast, async HTTP endpoints for dispatch creation, daylight calculation, runs, field notes, and stats. |
| **Data Models & Validation** | Pydantic v2 | `backend/app/models/schemas.py` | Validates data shapes for requests and responses (runs, daylight, biometrics, field logs). |
| **Database & Time-Series** | MongoDB Local/Atlas + Motor async | `backend/app/db/mongodb.py` | Stores run sessions (`runs` collection) and minute-by-minute Apple Health style heart rate and elevation curves (`biometrics` time-series collection). Supports offline fallback when DB is disconnected. |
| **Astronomical Calculation** | Astral (`astral`) + Geolocation | `backend/app/services/daylight.py` | Calculates exact local sunset and daylight minutes remaining for the user's GPS coordinates. Detects "Golden Hour". |
| **Concierge LLM Dispatch** | DigitalOcean Gemma LLM (OpenAI client) | `backend/app/services/llm_service.py` | Generates personalized, atmospheric, stoic dispatches addressed to John Wick. Has curated offline fallback templates if keys are absent. |
| **Voice Synthesis (TTS)** | ElevenLabs API + Web Speech API | `backend/app/services/audio_service.py`, `frontend/src/components/OutdoorMode.jsx` | Converts the concierge dispatch text into audio. Plays once and features an instant mute/unmute control. |
| **Field Notes Processing** | Python audio storage + LLM tags | `backend/app/services/field_log_pipeline.py`, `backend/app/services/transcription.py` | Ingests outdoor voice notes, generates nature-themed transcripts and Gemma sentiment tags, and stores them in the run. |
| **Workflow Engine (Opt-in)** | Temporal SDK | `backend/app/services/temporal_workflow.py`, `backend/app/worker.py` | Optional robust retry workflow engine for field logs when `USE_TEMPORAL=true`. Default is lightweight FastAPI `BackgroundTasks`. |
| **Historical Seed Data** | Python seed script | `backend/seed.py` | Populates 15 realistic historical run sessions for John Wick with gaps, mood scores, and Apple Health biometrics. |
| **Frontend UI Shell** | React 18, Vite, React Router 6 | `frontend/src/App.jsx`, `frontend/src/main.jsx` | Single-page PWA app featuring client-side routing (`/`, `/outdoor`, `/stats`, `/callback`). |
| **Typography & Design** | Plus Jakarta Sans + Inter (Apple / Wispr flow style) | `frontend/src/index.css`, `frontend/tailwind.config.js` | Sleek modern flowing typography with 5 curated themes and smooth CSS cubic-bezier transitions. |
| **Command Center** | Command modal (`⌘`) | `frontend/src/components/CommandCenterModal.jsx` | Minimal, clutter-free navigation where secondary settings and theme switching are stored away cleanly. |
| **Never-Pausing Timer** | Wall-clock delta + Page Visibility API | `frontend/src/components/OutdoorMode.jsx` | Calculates elapsed time using `Date.now() - startTime`. Accurately counts "pocket time" (phone stowed in pocket) vs. "screen time" without ever pausing. |
| **Cadence Accompaniment (Spotify)** | Dual Mode: Embed + PKCE OAuth | `frontend/src/components/SpotifyEmbed.jsx`, `frontend/src/hooks/useSpotifyAuth.js` | Zero-auth default playlist embed for immediate playback. Optional "Connect Spotify Premium" button using browser PKCE and Web Playback SDK. |
| **Offline Audio Resilience** | IndexedDB (`idb-keyval`) + Service Worker | `frontend/src/hooks/useOfflineQueue.js`, `frontend/public/sw.js` | Allows runners with zero cell service to record voice logs. Blobs are safely stored in IndexedDB and automatically synchronized when back online. |
| **Stats for Nerds Toggle** | Dynamic toggle pill | `frontend/src/components/StatsForNerds.jsx` | Seamless switch between "Essential" running summary and deep "For Nerds" cardiovascular telemetry. |

---

## 2. Directory Structure Map

```
Pace-Bud/
├── .env.example                          # Blueprint for all environment variables
├── .env                                  # Active environment config file
├── README.md                             # Quick reference and summary
├── PROJECT_GUIDE.md                      # This comprehensive architecture file
│
├── backend/                              # FASTAPI BACKEND
│   ├── requirements.txt                  # Python dependencies
│   ├── seed.py                           # Historical 15 runs and biometrics seeder
│   ├── uploads/                          # Stored field audio files
│   └── app/
│       ├── main.py                       # FastAPI application & lifespan
│       ├── worker.py                     # Temporal worker process (opt-in)
│       ├── core/
│       │   └── config.py                 # Pydantic Settings & environment variables
│       ├── db/
│       │   └── mongodb.py                # Async Mongo client & collection schemas
│       ├── models/
│       │   └── schemas.py                # Request/response Pydantic models
│       ├── services/
│       │   ├── daylight.py               # Astral sunset & daylight calculator
│       │   ├── llm_service.py            # Gemma concierge text & note summaries
│       │   ├── audio_service.py          # ElevenLabs TTS audio encoder
│       │   ├── transcription.py          # Mock nature-flavored audio transcriber
│       │   ├── field_log_pipeline.py     # End-to-end field note ingestion pipeline
│       │   └── temporal_workflow.py      # Temporal activities and workflow definition
│       └── api/
│           └── routes.py                 # REST API endpoints
│
└── frontend/                             # REACT + VITE FRONTEND
    ├── index.html                        # HTML shell with Google Fonts & SW registration
    ├── vite.config.js                    # Vite dev server with /api proxy
    ├── tailwind.config.js                # Tailwind color & font extensions
    ├── postcss.config.js                 # PostCSS setup
    ├── public/
    │   ├── sw.js                         # Service Worker for offline shell caching
    │   └── manifest.webmanifest          # PWA manifest
    └── src/
        ├── main.jsx                      # React DOM mounting
        ├── App.jsx                       # Navigation bar & Route definitions
        ├── index.css                     # 5 Luxury theme color variables
        ├── api/
        │   └── client.js                 # Fetch wrapper for all backend APIs
        ├── context/
        │   └── ThemeContext.jsx          # Theme state provider (persisted in localStorage)
        ├── hooks/
        │   ├── useOfflineQueue.js        # IndexedDB offline audio/text queue
        │   ├── useRecorder.js            # MediaRecorder voice audio recorder
        │   └── useSpotifyAuth.js         # Spotify PKCE token exchange & Web SDK
        └── components/
            ├── ThemeSwitcher.jsx         # Dropdown to toggle 5 bespoke palettes
            ├── DeskBreaker.jsx           # Home screen: Daylight, mood slider, dispatch trigger
            ├── OutdoorMode.jsx           # Running screen: Tabular timer, brass ring, voice note
            ├── SpotifyEmbed.jsx          # Dual-mode music player
            ├── StatsForNerds.jsx         # Analytics: Daylight correlation & biometrics
            └── SpotifyCallback.jsx       # OAuth redirect receiver
```

---

## 3. How the Data Flows

### A. Pre-Run Flow (`/`)
1. User opens the app.
2. The browser asks for location coordinates (or falls back to default coordinates).
3. The app queries `GET /api/daylight?lat=...&lon=...`.
4. Astral calculates the exact sunset time and minutes of light remaining.
5. User adjusts their current pre-run mood (1-10) and target duration.
6. User clicks **"Step Outside — Receive Dispatch"**.
7. The app calls `POST /api/dispatch`:
   - Gemma LLM crafts a stoic John Wick dispatch.
   - ElevenLabs synthesizes the voice dispatch (or local fallback).
   - An active run record is created in MongoDB.
8. User is redirected to `/outdoor`.

### B. In-Stride Flow (`/outdoor`)
1. The dispatch voice automatically plays.
2. The timer counts up using `Date.now() - startTime` (never pauses).
3. When the user locks the phone or switches apps, the `visibilitychange` event logs duration as `pocket_s`. When viewing the screen, it logs `screen_s`.
4. The user can tap **"Record Voice Note"** while running outside.
5. Even if there is **zero cell signal**:
   - The audio blob is saved into browser **IndexedDB** via `idb-keyval`.
   - As soon as the phone reconnects to cellular/WiFi, `useOfflineQueue` sends it to `POST /api/runs/{id}/field-logs`.
   - The backend runs `field_log_pipeline.py` to transcribe the audio and generate Gemma summary tags.

### C. Completion & Analytics Flow (`/stats`)
1. User taps **"Conclude Session"** and rates their post-run mood (1-10).
2. The app sends `POST /api/runs/{id}/complete` with final pocket time, screen time, and mood delta.
3. The user views `/stats`:
   - Visualizes how runs during different daylight windows improved mood (+Δ pts).
   - Inspects Apple Health minute-by-minute heart rate curves (warm-up, steady peak, cool-down).
   - Reviews historical field note transcripts and tags.

---

## 4. Key Design Decisions

- **Demo User (John Wick)**: Designed with zero barrier to entry. No signups or passwords. You are greeted as Mr. Wick.
- **Resilient Fallbacks**: If MongoDB is not running, the app continues to operate with built-in mock seed data. If Gemma or ElevenLabs API keys are not supplied, curated stoic dispatches and browser `SpeechSynthesis` seamlessly take over.
- **Dual-Mode Spotify**: Works out-of-the-box via embed iframe without needing any developer accounts. If a user wants full Web Playback SDK controls, they can optionally connect their Spotify Premium account using secure browser PKCE (no client secret needed).
