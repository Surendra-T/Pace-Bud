import hashlib
from typing import Optional

SAMPLE_TRANSCRIPTS = [
    "Mile two crossing the bridge. The wind off the reservoir is sharp, clearing the head.",
    "Footing is crisp over dry pine needles. Breathing synced 3 to 2 with footsteps. Complete quiet.",
    "Sun dropping behind the tree line now. Shadows stretching out. Pace feels natural, zero fatigue.",
    "Ascending the ridge path. Elevating heart rate intentionally. The city noise is completely muffled here.",
    "Rounding the lake loop. Still surface, cool evening air settling in. Energy returning rapidly."
]

def mock_transcribe_audio(file_path: str, raw_text: Optional[str] = None) -> str:
    """
    Mock transcription service as specified in implementation plan.
    Deterministic nature-flavored transcript based on hash of audio file path or content.
    If raw_text is provided (e.g. user typed a note alongside audio), incorporates it.
    """
    if raw_text and raw_text.strip():
        return raw_text.strip()

    h = int(hashlib.md5(file_path.encode()).hexdigest(), 16)
    idx = h % len(SAMPLE_TRANSCRIPTS)
    return SAMPLE_TRANSCRIPTS[idx]
