import logging
import random
from typing import Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_DISPATCHES = [
    "Good afternoon, Mr. Wick. The brisk air awaits. Leave the brass and noise behind. 45 minutes of rhythmic cadence through the dusk. Clear the slate.",
    "Target acquired: the open parkway. Clear mind, steady stride. The daylight is fading into gold; maintain disciplined pace until twilight settles.",
    "Shadows are lengthening, Mr. Wick. Focus on breath and ground contact. 30 minutes of undisturbed momentum will reset your equilibrium.",
    "A quiet route has been calculated. Crisp temperature, stillness in the trees. Keep the stride light and purposeful."
]

def generate_dispatch_text(mood_pre: int, daylight_minutes: int, duration_min: int) -> str:
    """
    Generates a stoic, atmospheric John Wick dispatch using Gemma (OpenAI compatible API)
    with graceful fallback to curated templates.
    """
    # Check if Gemma endpoint is configured
    if not settings.DIGITALOCEAN_GEMMA_ENDPOINT or not settings.DIGITALOCEAN_API_KEY:
        logger.info("DigitalOcean Gemma not configured or key missing. Using curated stoic fallback dispatch.")
        base = random.choice(FALLBACK_DISPATCHES)
        if daylight_minutes <= 30:
            return f"{base} Daylight is scarce ({daylight_minutes}m remain) — make every stride count."
        return f"{base} Daylight remaining: {daylight_minutes} minutes. Target session: {duration_min} minutes."

    try:
        client = OpenAI(
            base_url=settings.DIGITALOCEAN_GEMMA_ENDPOINT,
            api_key=settings.DIGITALOCEAN_API_KEY,
            timeout=8.0
        )
        prompt = (
            f"You are the Concierge dispatching John Wick for an outdoor decompression run.\n"
            f"Pre-run mood rating: {mood_pre}/10.\n"
            f"Daylight remaining: {daylight_minutes} minutes.\n"
            f"Target session duration: {duration_min} minutes.\n"
            f"Tone: Stoic, elegant, Continental-concierge style, atmospheric, brief (2-3 sentences max). "
            f"Directly address Mr. Wick. Encourage leaving desk fatigue behind and tuning into rhythm."
        )
        response = client.chat.completions.create(
            model=settings.GEMMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )
        dispatch = response.choices[0].message.content.strip()
        return dispatch
    except Exception as e:
        logger.warning(f"Gemma API call failed ({e}). Falling back to curated dispatch.")
        base = random.choice(FALLBACK_DISPATCHES)
        return f"{base} Focus on steady cadence for {duration_min} minutes."

def generate_log_insight(transcript: str) -> dict:
    """
    Summarizes audio field notes, extracts sentiment and nature tags using Gemma or heuristic fallback.
    """
    if not settings.DIGITALOCEAN_GEMMA_ENDPOINT or not settings.DIGITALOCEAN_API_KEY:
        # Heuristic fallback
        words = transcript.lower().split()
        tags = []
        if any(w in words for w in ["wind", "breeze", "air"]):
            tags.append("wind")
        if any(w in words for w in ["trees", "leaves", "forest", "park", "woods"]):
            tags.append("canopy")
        if any(w in words for w in ["gravel", "path", "trail", "pavement", "mud"]):
            tags.append("terrain")
        if any(w in words for w in ["breath", "stride", "cadence", "heart", "pace"]):
            tags.append("cadence")
        if not tags:
            tags = ["solitude", "stride"]

        return {
            "summary": f"Field observation: {transcript[:100]}...",
            "sentiment": "focused & composed",
            "tags": tags[:4]
        }

    try:
        client = OpenAI(
            base_url=settings.DIGITALOCEAN_GEMMA_ENDPOINT,
            api_key=settings.DIGITALOCEAN_API_KEY,
            timeout=8.0
        )
        prompt = (
            f"Analyze this outdoor running field note:\n\"{transcript}\"\n\n"
            f"Provide a 1-sentence summary, an overall sentiment (e.g. grounded, exhausted, invigorated, tranquil), "
            f"and up to 3 short tags (comma-separated).\n"
            f"Format response exactly as:\nSummary: <summary>\nSentiment: <sentiment>\nTags: <tag1, tag2, tag3>"
        )
        response = client.chat.completions.create(
            model=settings.GEMMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.3
        )
        content = response.choices[0].message.content.strip()
        lines = content.split("\n")
        summary = "Field observation captured."
        sentiment = "composed"
        tags = ["stride"]
        for line in lines:
            if line.startswith("Summary:"):
                summary = line.replace("Summary:", "").strip()
            elif line.startswith("Sentiment:"):
                sentiment = line.replace("Sentiment:", "").strip()
            elif line.startswith("Tags:"):
                raw_tags = line.replace("Tags:", "").strip()
                tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
        return {"summary": summary, "sentiment": sentiment, "tags": tags}
    except Exception as e:
        logger.warning(f"Gemma log insight failed ({e}). Using heuristic fallback.")
        return {
            "summary": f"Field observation: {transcript[:80]}...",
            "sentiment": "grounded",
            "tags": ["trail", "pace"]
        }
