import asyncio
import random
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/pacebud")
MONGODB_DB = os.getenv("MONGODB_DB", "pacebud")
DEMO_USER_ID = os.getenv("DEMO_USER_ID", "john-wick")

DISPATCH_SAMPLES = [
    "Good afternoon, Mr. Wick. Leave the desk and weapon behind. 45 minutes across the parkway under autumn skies.",
    "Target: 40 minutes of quiet stride. Sunset in 28 minutes. Clear the slate and let the cadence steady your focus.",
    "Concierge dispatch: Dusk settles over the ridge. Cool breeze, crisp gravel path. Maintain calm breath.",
    "A brisk evening awaits, Mr. Wick. 35 minutes through the western grove. Keep your momentum rhythmic and sharp.",
    "The slate is clean. Step into the golden light before twilight fades. Thirty undisturbed minutes."
]

FIELD_LOG_SAMPLES = [
    {
        "text": "Passing the reservoir. Cold wind off the surface. Breathing locked in rhythm.",
        "summary": "Reservoir passage with brisk wind and synchronized breath.",
        "sentiment": "focused & composed",
        "tags": ["wind", "cadence", "water"]
    },
    {
        "text": "Climbing the steep hill by the stone pavilion. Heart rate elevated, legs feel light.",
        "summary": "Hill climb with intentional effort near historic stone pavilion.",
        "sentiment": "determined",
        "tags": ["elevation", "terrain", "stride"]
    },
    {
        "text": "Sunset dropping through birch trees. Complete silence on the trail.",
        "summary": "Solitary trail section at twilight canopy.",
        "sentiment": "tranquil",
        "tags": ["canopy", "solitude", "dusk"]
    }
]

def generate_biometrics_curve(run_id: str, start_time: datetime, duration_minutes: int):
    """
    Generates realistic minute-by-minute Apple Health biometrics:
    - Heart rate curve: warmup (115-135) -> steady peak (145-165) -> cooldown (120-130)
    - Step count: ~150-175 steps/min
    - Elevation gain / flights climbed
    """
    biometrics = []
    base_hr = 120
    for i in range(duration_minutes):
        t = start_time + timedelta(minutes=i)
        
        # Warmup (first 15%), Peak (middle 70%), Cooldown (last 15%)
        progress = i / max(1, duration_minutes)
        if progress < 0.15:
            hr = base_hr + (progress / 0.15) * 30 + random.uniform(-3, 3)
            steps = int(random.uniform(140, 155))
            elev = random.choice([0.0, 0.5, 1.0])
        elif progress > 0.85:
            remaining = (1.0 - progress) / 0.15
            hr = base_hr + 10 + remaining * 25 + random.uniform(-2, 2)
            steps = int(random.uniform(130, 145))
            elev = 0.0
        else:
            hr = 152 + random.uniform(-6, 8)
            steps = int(random.uniform(160, 178))
            elev = random.choice([0.0, 0.0, 0.5, 1.5, 2.0])

        biometrics.append({
            "timestamp": t,
            "user_id": DEMO_USER_ID,
            "run_id": run_id,
            "heart_rate": round(hr, 1),
            "step_count": steps,
            "elevation_gain": elev
        })
    return biometrics

def seed_database():
    print(f"Connecting to MongoDB at {MONGODB_URI}...")
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=4000)
        db = client[MONGODB_DB]
        client.admin.command('ping')
    except Exception as e:
        print(f"Failed to connect to MongoDB ({e}). Please ensure your MONGODB_URI is reachable.")
        return

    print("Wiping existing 'runs' and 'biometrics' collections for demo user...")
    db["runs"].delete_many({"user_id": DEMO_USER_ID})
    db["biometrics"].delete_many({"user_id": DEMO_USER_ID})

    now = datetime.now(timezone.utc)
    # Generate 15 sessions over the past 21 days with realistic gaps
    runs_to_insert = []
    all_biometrics = []

    # Select 15 days out of last 21
    active_days_ago = [0, 1, 2, 4, 5, 7, 8, 9, 11, 13, 14, 16, 17, 19, 21]

    for idx, days_ago in enumerate(active_days_ago):
        run_id = f"run_seed_{idx+1:03d}"
        session_time = now - timedelta(days=days_ago, hours=random.choice([1, 2, 3]))
        
        # Pre-mood: lower after work (3 to 6); Post-mood: higher (7 to 10)
        mood_pre = random.randint(3, 6)
        mood_post = min(10, mood_pre + random.randint(2, 5))
        mood_delta = mood_post - mood_pre
        
        target_min = random.choice([30, 35, 40, 45, 50])
        elapsed_s = target_min * 60 + random.randint(-40, 60)
        daylight_at_start = random.choice([15, 25, 35, 45, 60, 75])
        
        # Screen vs pocket time: Desk workers running outside put phone in pocket mostly!
        pocket_s = int(elapsed_s * random.uniform(0.82, 0.94))
        screen_s = elapsed_s - pocket_s

        # Field logs (1 to 3 logs per session)
        field_logs = []
        num_logs = random.randint(1, 3)
        chosen_samples = random.sample(FIELD_LOG_SAMPLES, k=num_logs)
        for log_idx, s in enumerate(chosen_samples):
            log_time = session_time + timedelta(minutes=int(target_min * (log_idx + 1) / (num_logs + 1)))
            field_logs.append({
                "client_id": f"seed_log_{idx}_{log_idx}",
                "created_at": log_time,
                "audio_path": None,
                "audio_size_bytes": random.randint(45000, 120000),
                "raw_text": s["text"],
                "transcript": s["text"],
                "summary": s["summary"],
                "sentiment": s["sentiment"],
                "tags": s["tags"],
                "status": "completed"
            })

        visibility_events = [
            {"state": "screen", "timestamp": session_time, "duration_s": 30},
            {"state": "pocket", "timestamp": session_time + timedelta(seconds=30), "duration_s": pocket_s},
            {"state": "screen", "timestamp": session_time + timedelta(seconds=pocket_s+30), "duration_s": screen_s - 30}
        ]

        run_doc = {
            "run_id": run_id,
            "user_id": DEMO_USER_ID,
            "mood_pre": mood_pre,
            "mood_post": mood_post,
            "mood_delta": mood_delta,
            "daylight_at_start": daylight_at_start,
            "dispatch_text": random.choice(DISPATCH_SAMPLES),
            "target_duration_min": target_min,
            "elapsed_s": elapsed_s,
            "pocket_s": pocket_s,
            "screen_s": screen_s,
            "status": "completed",
            "visibility_events": visibility_events,
            "field_logs": field_logs,
            "created_at": session_time,
            "completed_at": session_time + timedelta(seconds=elapsed_s)
        }
        runs_to_insert.append(run_doc)

        # Generate biometrics curve
        bio = generate_biometrics_curve(run_id, session_time, target_min)
        all_biometrics.extend(bio)

    print(f"Inserting {len(runs_to_insert)} runs for John Wick...")
    db["runs"].insert_many(runs_to_insert)

    print(f"Inserting {len(all_biometrics)} biometrics minute data points...")
    db["biometrics"].insert_many(all_biometrics)

    print("Seeding completed successfully! John Wick profile is ready with 15 historical runs.")

if __name__ == "__main__":
    seed_database()
