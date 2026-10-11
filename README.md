# Pace-Bud 🏃‍♂️🍂

> **Mindful outdoor running companion with daylight intelligence, bespoke Continental concierge aesthetics, and offline resilience.**

Pace-Bud frees desk workers from endless screen time and takes them into the golden warmth of dusk. With astronomical sunset tracking, stoic dispatches, never-pausing timer mechanics, and offline voice logging, it restores balance and vitality.

---

## 🏛 Features

1. **Astronomical Horizon & Sunset Calculation**: Automatically computes exact sunset and minutes of remaining sunlight using the browser's coordinates and astronomical ephemeris (`astral`).
2. **The Continental Concierge**: Personal stoic running dispatches inspired by John Wick's Continental universe, driven by DigitalOcean Gemma LLM (with offline fallback templates) and synthesized via ElevenLabs voice (or local browser `SpeechSynthesis`).
3. **Never-Pausing Tabular Timer**: Built on timestamp offsets so locking your phone or putting it in your pocket won't pause the timer. Uses the Page Visibility API to calculate **pocket time vs. screen time**.
4. **Cadence Accompaniment (Dual-Mode Spotify)**:
   - **Default**: Zero-auth Spotify Embed iframe ready immediately.
   - **Optional**: One-click "Connect Spotify Premium" via OAuth PKCE & Web Playback SDK.
5. **Offline Voice & Field Logs**: Record voice observations while running outside with zero cell signal. Stored in IndexedDB (`idb-keyval`) and automatically synced when back online.
6. **Bespoke Luxury Palettes**: 5 switchable Continental themes:
   - *Oxford Navy* (Default)
   - *Racing Green*
   - *Camel & Cashmere*
   - *St. Moritz Ice*
   - *Vintage Parchment*
7. **Stats for Nerds**: Deep analytics correlating daylight remaining with mood delta improvements, and Apple Health minute-by-minute heart rate / elevation curves.

---

## 🛠 Tech Stack

- **Backend**: FastAPI, Pydantic, Motor / PyMongo, Astral, OpenAI SDK (Gemma), ElevenLabs API, Temporal SDK (optional)
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router 6, idb-keyval, Service Worker (PWA)

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) MongoDB Atlas or local MongoDB instance

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your API keys:
```env
MONGODB_URI=mongodb+srv://...  # Or local mongodb://localhost:27017/pacebud
DIGITALOCEAN_GEMMA_ENDPOINT=http://<droplet-ip>/v1
DIGITALOCEAN_API_KEY=your-api-key
GEMMA_MODEL=gemma-2-9b-it
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
USE_TEMPORAL=false
```
*Note: If MongoDB, Gemma, or ElevenLabs keys are not provided, Pace-Bud gracefully falls back to local curated dispatches, browser speech synthesis, and offline seed analytics.*

### 3. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

To seed 15 historical runs for John Wick with biometrics:
```bash
python seed.py
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Temporal Workflow (Optional)

In-app background processing is the default (`USE_TEMPORAL=false`).
To activate Temporal workflow orchestration:
1. Start Temporal server: `temporal server start-dev`
2. Set `USE_TEMPORAL=true` in `.env`
3. Start the worker:
   ```bash
   python backend/app/worker.py
   ```

---

## 🛡 Verification Checklist

- [x] Backend syntax & import validation (`app.main:app`)
- [x] Frontend production build (`npm run build`)
- [x] Daylight sunset calculations (`astral`)
- [x] Offline IndexedDB audio log queuing
- [x] Dual-mode Spotify player
- [x] 5 Luxury theme palettes with persistent local state
