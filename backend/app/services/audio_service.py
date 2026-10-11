import logging
import base64
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

async def text_to_speech_elevenlabs(text: str) -> Optional[str]:
    """
    Synthesizes speech using ElevenLabs API and returns base64-encoded audio.
    If API key is missing or call fails, returns None so frontend gracefully uses browser SpeechSynthesis.
    """
    if not settings.ELEVENLABS_API_KEY:
        logger.info("ElevenLabs API key not configured. Frontend will gracefully fallback to browser speechSynthesis.")
        return None

    try:
        import httpx
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVENLABS_API_KEY
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.65,
                "similarity_boost": 0.75
            }
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=data, headers=headers)
            if response.status_code == 200:
                audio_bytes = response.content
                return base64.b64encode(audio_bytes).decode("utf-8")
            else:
                logger.warning(f"ElevenLabs TTS returned HTTP {response.status_code}: {response.text}")
                return None
    except Exception as e:
        logger.warning(f"ElevenLabs synthesis error ({e}). Falling back to browser speech.")
        return None
