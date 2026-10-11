import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form, Query
from app.core.config import settings
from app.db.mongodb import get_database
from app.models.schemas import (
    UserProfile, DaylightResponse, DispatchRequest, DispatchResponse,
    CompleteRunRequest, StatsResponse, RunSchema
)
from app.services.daylight import calculate_daylight
from app.services.llm_service import generate_dispatch_text
from app.services.audio_service import text_to_speech_elevenlabs
from app.services.field_log_pipeline import process_field_log_pipeline
from app.services.temporal_workflow import dispatch_temporal_field_log

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 1. Health check
@router.get("/health")
async def health_check():
    db = get_database()
    mongo_ok = False
    if db is not None:
        try:
            await db.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False

    return {
        "status": "ok",
        "mongodb": "connected" if mongo_ok else "disconnected",
        "llm": "configured" if (settings.DIGITALOCEAN_GEMMA_ENDPOINT and settings.DIGITALOCEAN_API_KEY) else "fallback_mode",
        "tts": "configured" if settings.ELEVENLABS_API_KEY else "browser_speech_fallback",
        "processing_mode": "temporal" if settings.USE_TEMPORAL else "inline_background_tasks",
        "demo_user": settings.DEMO_USER_NAME
    }

# 2. User profile
@router.get("/me", response_model=UserProfile)
async def get_current_user():
    db = get_database()
    streak = 12
    total_runs = 15
    total_minutes = 645.0

    if db is not None:
        try:
            cursor = db["runs"].find({"user_id": settings.DEMO_USER_ID, "status": "completed"})
            runs = await cursor.to_list(length=100)
            if runs:
                total_runs = len(runs)
                total_minutes = round(sum(r.get("elapsed_s", 0) for r in runs) / 60.0, 1)
        except Exception as e:
            logger.warning(f"Error fetching user stats: {e}")

    return UserProfile(
        user_id=settings.DEMO_USER_ID,
        display_name=settings.DEMO_USER_NAME,
        streak_days=streak,
        total_runs=total_runs,
        total_minutes=total_minutes
    )

# 3. Daylight calculation
@router.get("/daylight", response_model=DaylightResponse)
async def get_daylight(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    data = calculate_daylight(lat, lon)
    return DaylightResponse(**data)

# 4. Dispatch Generation & Run Initialization
@router.post("/dispatch", response_model=DispatchResponse)
async def create_dispatch(req: DispatchRequest):
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    daylight_info = calculate_daylight(req.lat, req.lon)
    daylight_min = daylight_info["minutes_remaining"]

    # Recommended or requested duration capped to sensible limits
    target_duration = min(req.target_duration_min or 45, max(15, daylight_min if daylight_min > 0 else 45))

    # Generate atmospheric dispatch text
    prompt_text = generate_dispatch_text(
        mood_pre=req.mood_pre,
        daylight_minutes=daylight_min,
        duration_min=target_duration
    )

    # ElevenLabs audio (base64) or None for browser synthesis fallback
    audio_b64 = await text_to_speech_elevenlabs(prompt_text)

    now = datetime.now(timezone.utc)
    new_run = {
        "run_id": run_id,
        "user_id": settings.DEMO_USER_ID,
        "mood_pre": req.mood_pre,
        "mood_post": None,
        "mood_delta": None,
        "daylight_at_start": daylight_min,
        "dispatch_text": prompt_text,
        "target_duration_min": target_duration,
        "elapsed_s": 0,
        "pocket_s": 0,
        "screen_s": 0,
        "status": "active",
        "visibility_events": [],
        "field_logs": [],
        "created_at": now,
        "completed_at": None
    }

    db = get_database()
    if db is not None:
        try:
            await db["runs"].insert_one(new_run)
        except Exception as e:
            logger.error(f"Error persisting run: {e}")

    return DispatchResponse(
        run_id=run_id,
        user_id=settings.DEMO_USER_ID,
        prompt_text=prompt_text,
        audio_base64=audio_b64,
        target_duration_min=target_duration,
        daylight_minutes_remaining=daylight_min,
        created_at=now
    )

# 5. Complete Run
@router.post("/runs/{run_id}/complete")
async def complete_run(run_id: str, payload: CompleteRunRequest):
    db = get_database()
    if db is None:
        return {"status": "success", "run_id": run_id, "mood_delta": 4}

    run = await db["runs"].find_one({"run_id": run_id})
    if not run:
        raise HTTPException(status_code=404, detail="Run session not found")

    mood_pre = run.get("mood_pre", 5)
    mood_delta = payload.mood_post - mood_pre
    now = datetime.now(timezone.utc)

    update_doc = {
        "$set": {
            "mood_post": payload.mood_post,
            "mood_delta": mood_delta,
            "elapsed_s": payload.elapsed_s,
            "pocket_s": payload.pocket_s,
            "screen_s": payload.screen_s,
            "status": "completed",
            "completed_at": now
        },
        "$push": {
            "visibility_events": {"$each": [e.model_dump() for e in payload.visibility_events]}
        }
    }

    await db["runs"].update_one({"run_id": run_id}, update_doc)
    return {
        "status": "success",
        "run_id": run_id,
        "mood_delta": mood_delta,
        "elapsed_s": payload.elapsed_s,
        "pocket_s": payload.pocket_s,
        "screen_s": payload.screen_s
    }

# 6. Upload Field Log (Audio / Text)
@router.post("/runs/{run_id}/field-logs")
async def upload_field_log(
    run_id: str,
    background_tasks: BackgroundTasks,
    client_id: str = Form(...),
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None)
):
    saved_audio_path = None
    file_size = 0

    if audio:
        ext = os.path.splitext(audio.filename or "")[1] or ".webm"
        safe_filename = f"{client_id}_{uuid.uuid4().hex[:6]}{ext}"
        saved_audio_path = os.path.join(UPLOAD_DIR, safe_filename)
        content = await audio.read()
        file_size = len(content)
        with open(saved_audio_path, "wb") as f:
            f.write(content)

    db = get_database()
    # Insert placeholder entry if not already present
    placeholder_log = {
        "client_id": client_id,
        "created_at": datetime.now(timezone.utc),
        "audio_path": saved_audio_path,
        "audio_size_bytes": file_size,
        "raw_text": text,
        "transcript": None,
        "summary": "Analyzing field log...",
        "sentiment": "processing",
        "tags": [],
        "status": "processing"
    }

    if db is not None:
        existing = await db["runs"].find_one({"run_id": run_id, "field_logs.client_id": client_id})
        if not existing:
            await db["runs"].update_one(
                {"run_id": run_id},
                {"$push": {"field_logs": placeholder_log}},
                upsert=True
            )

    # Dispatch: Temporal if configured, otherwise FastAPI BackgroundTasks
    scheduled_temporal = False
    if settings.USE_TEMPORAL:
        scheduled_temporal = await dispatch_temporal_field_log(
            run_id=run_id,
            client_id=client_id,
            file_path=saved_audio_path,
            raw_text=text,
            file_size_bytes=file_size
        )

    if not scheduled_temporal:
        background_tasks.add_task(
            process_field_log_pipeline,
            run_id=run_id,
            client_id=client_id,
            file_path=saved_audio_path,
            raw_text=text,
            file_size_bytes=file_size
        )

    return {
        "status": "enqueued",
        "client_id": client_id,
        "run_id": run_id,
        "processing_mode": "temporal" if scheduled_temporal else "inline_background_task"
    }

# 7. Get Recent Runs
@router.get("/runs")
async def get_recent_runs(limit: int = 20):
    db = get_database()
    if db is None:
        return []

    cursor = db["runs"].find({"user_id": settings.DEMO_USER_ID}).sort("created_at", -1).limit(limit)
    runs = await cursor.to_list(length=limit)
    for r in runs:
        r["_id"] = str(r["_id"])
    return runs

# 8. Stats for Nerds
@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    db = get_database()
    
    # Check if database is live and reachable
    is_live = False
    if db is not None:
        try:
            await db.command("ping")
            is_live = True
        except Exception:
            is_live = False

    if not is_live:
        # Fallback offline seed data for John Wick demo
        now = datetime.now(timezone.utc)
        mock_biometrics = []
        for i in range(40):
            hr = 120 + (i / 40) * 35 if i < 15 else (155 - (i - 15) * 0.8)
            mock_biometrics.append({
                "_id": f"bio_{i}",
                "timestamp": now.isoformat(),
                "heart_rate": round(hr, 1),
                "step_count": 165,
                "elevation_gain": 0.5 if i % 5 == 0 else 0
            })

        mock_runs = [
            {
                "_id": "run_seed_001",
                "run_id": "run_seed_001",
                "user_id": settings.DEMO_USER_ID,
                "mood_pre": 4,
                "mood_post": 8,
                "mood_delta": 4,
                "daylight_at_start": 35,
                "elapsed_s": 2700,
                "pocket_s": 2400,
                "screen_s": 300,
                "created_at": now.isoformat(),
                "field_logs": [
                    {
                        "transcript": "Passing the reservoir. Cold wind off the surface. Breathing locked in rhythm.",
                        "summary": "Reservoir passage with brisk wind and synchronized breath.",
                        "sentiment": "focused & composed",
                        "tags": ["wind", "cadence", "water"]
                    }
                ]
            },
            {
                "_id": "run_seed_002",
                "run_id": "run_seed_002",
                "user_id": settings.DEMO_USER_ID,
                "mood_pre": 3,
                "mood_post": 7,
                "mood_delta": 4,
                "daylight_at_start": 45,
                "elapsed_s": 2400,
                "pocket_s": 2100,
                "screen_s": 300,
                "created_at": (now).isoformat(),
                "field_logs": [
                    {
                        "transcript": "Sunset dropping through birch trees. Complete silence on the trail.",
                        "summary": "Solitary trail section at twilight canopy.",
                        "sentiment": "tranquil",
                        "tags": ["canopy", "solitude", "dusk"]
                    }
                ]
            }
        ]

        return StatsResponse(
            total_runs=15,
            total_minutes=645.0,
            avg_mood_delta=3.8,
            current_streak=14,
            recent_runs=mock_runs,
            mood_vs_daylight=[
                {"daylight_remaining_min": 15, "avg_mood_delta": 4.5, "count": 4},
                {"daylight_remaining_min": 30, "avg_mood_delta": 4.0, "count": 5},
                {"daylight_remaining_min": 45, "avg_mood_delta": 3.6, "count": 4},
                {"daylight_remaining_min": 60, "avg_mood_delta": 3.2, "count": 2},
            ],
            recent_biometrics=mock_biometrics
        )

    runs_cursor = db["runs"].find({"user_id": settings.DEMO_USER_ID, "status": "completed"}).sort("created_at", -1)
    runs = await runs_cursor.to_list(length=50)

    total_runs = len(runs)
    total_minutes = round(sum(r.get("elapsed_s", 0) for r in runs) / 60.0, 1)
    deltas = [r["mood_delta"] for r in runs if r.get("mood_delta") is not None]
    avg_mood_delta = round(sum(deltas) / len(deltas), 2) if deltas else 3.2

    # Group mood delta vs daylight
    daylight_buckets = {}
    for r in runs:
        dl = r.get("daylight_at_start", 45)
        bucket = (dl // 15) * 15
        delt = r.get("mood_delta", 3)
        if bucket not in daylight_buckets:
            daylight_buckets[bucket] = []
        daylight_buckets[bucket].append(delt)

    mood_vs_daylight = []
    for bucket in sorted(daylight_buckets.keys()):
        arr = daylight_buckets[bucket]
        mood_vs_daylight.append({
            "daylight_remaining_min": bucket,
            "avg_mood_delta": round(sum(arr) / len(arr), 2),
            "count": len(arr)
        })

    # Recent biometrics for charting
    bio_cursor = db["biometrics"].find({"user_id": settings.DEMO_USER_ID}).sort("timestamp", -1).limit(60)
    biometrics = await bio_cursor.to_list(length=60)
    for b in biometrics:
        b["_id"] = str(b["_id"])

    # Clean runs for response
    clean_runs = []
    for r in runs[:10]:
        r["_id"] = str(r["_id"])
        clean_runs.append(r)

    return StatsResponse(
        total_runs=total_runs,
        total_minutes=total_minutes,
        avg_mood_delta=avg_mood_delta,
        current_streak=14,
        recent_runs=clean_runs,
        mood_vs_daylight=mood_vs_daylight,
        recent_biometrics=biometrics[::-1]
    )
