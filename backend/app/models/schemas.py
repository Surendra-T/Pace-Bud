from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- User Profile ---
class UserProfile(BaseModel):
    user_id: str
    display_name: str
    streak_days: int
    total_runs: int
    total_minutes: float

# --- Daylight Calculation ---
class DaylightResponse(BaseModel):
    sunset: str
    minutes_remaining: int
    is_golden_hour: bool
    status: str
    recommended_duration_min: int

# --- Run Models ---
class DispatchRequest(BaseModel):
    mood_pre: int = Field(ge=1, le=10, description="Pre-run mood rating 1-10")
    lat: Optional[float] = None
    lon: Optional[float] = None
    target_duration_min: Optional[int] = 45

class DispatchResponse(BaseModel):
    run_id: str
    user_id: str
    prompt_text: str
    audio_base64: Optional[str] = None
    target_duration_min: int
    daylight_minutes_remaining: int
    created_at: datetime

class VisibilityEvent(BaseModel):
    state: str  # 'pocket' (hidden) or 'screen' (visible)
    timestamp: datetime
    duration_s: Optional[float] = 0

class CompleteRunRequest(BaseModel):
    mood_post: int = Field(ge=1, le=10, description="Post-run mood rating 1-10")
    elapsed_s: int
    pocket_s: int = 0
    screen_s: int = 0
    visibility_events: List[VisibilityEvent] = []

class FieldLogEntry(BaseModel):
    client_id: str
    created_at: datetime
    audio_path: Optional[str] = None
    audio_size_bytes: Optional[int] = 0
    raw_text: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    tags: List[str] = []
    status: str = "processing"  # 'processing', 'completed', 'failed'

class RunSchema(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    run_id: str
    user_id: str
    mood_pre: int
    mood_post: Optional[int] = None
    mood_delta: Optional[int] = None
    daylight_at_start: Optional[int] = None
    dispatch_text: Optional[str] = None
    target_duration_min: int = 45
    elapsed_s: int = 0
    pocket_s: int = 0
    screen_s: int = 0
    status: str = "active"  # 'active', 'completed'
    visibility_events: List[VisibilityEvent] = []
    field_logs: List[FieldLogEntry] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

# --- Biometrics Time-Series ---
class BiometricPoint(BaseModel):
    timestamp: datetime
    user_id: str
    run_id: str
    heart_rate: Optional[float] = None  # bpm
    step_count: Optional[int] = None
    elevation_gain: Optional[float] = None  # meters / flights

# --- Stats Schema ---
class MoodDeltaDaylight(BaseModel):
    daylight_remaining_min: int
    avg_mood_delta: float
    count: int

class StatsResponse(BaseModel):
    total_runs: int
    total_minutes: float
    avg_mood_delta: float
    current_streak: int
    recent_runs: List[Dict[str, Any]]
    mood_vs_daylight: List[MoodDeltaDaylight]
    recent_biometrics: List[Dict[str, Any]]
