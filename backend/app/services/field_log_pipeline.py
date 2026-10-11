import os
import logging
from datetime import datetime, timezone
from typing import Optional
from app.db.mongodb import get_database
from app.services.transcription import mock_transcribe_audio
from app.services.llm_service import generate_log_insight

logger = logging.getLogger(__name__)

async def process_field_log_pipeline(
    run_id: str,
    client_id: str,
    file_path: Optional[str] = None,
    raw_text: Optional[str] = None,
    file_size_bytes: int = 0
) -> dict:
    """
    Shared pipeline for processing field logs (audio + text).
    1. Transcribe (deterministic nature-flavored mock or user raw text)
    2. Generate insights (Gemma summary, sentiment, tags)
    3. Save/Update field log in database
    """
    db = get_database()
    logger.info(f"Processing field log {client_id} for run {run_id}")

    try:
        # 1. Transcribe
        transcript = mock_transcribe_audio(file_path or client_id, raw_text)

        # 2. Insights
        insight = generate_log_insight(transcript)

        log_data = {
            "client_id": client_id,
            "created_at": datetime.now(timezone.utc),
            "audio_path": file_path,
            "audio_size_bytes": file_size_bytes,
            "raw_text": raw_text,
            "transcript": transcript,
            "summary": insight.get("summary"),
            "sentiment": insight.get("sentiment"),
            "tags": insight.get("tags", []),
            "status": "completed"
        }

        # 3. Update in MongoDB
        if db is not None:
            # Check if entry already exists (by client_id)
            run = await db["runs"].find_one({"run_id": run_id, "field_logs.client_id": client_id})
            if run:
                # Update existing log
                await db["runs"].update_one(
                    {"run_id": run_id, "field_logs.client_id": client_id},
                    {"$set": {"field_logs.$": log_data}}
                )
            else:
                # Push new log entry
                await db["runs"].update_one(
                    {"run_id": run_id},
                    {"$push": {"field_logs": log_data}}
                )

        logger.info(f"Field log {client_id} completed successfully.")
        return log_data

    except Exception as e:
        logger.error(f"Error processing field log {client_id}: {e}")
        error_entry = {
            "client_id": client_id,
            "created_at": datetime.now(timezone.utc),
            "audio_path": file_path,
            "audio_size_bytes": file_size_bytes,
            "raw_text": raw_text,
            "transcript": raw_text or "Audio processing encountered an issue.",
            "summary": "Audio note recorded.",
            "sentiment": "neutral",
            "tags": ["audio"],
            "status": "failed"
        }
        if db is not None:
            await db["runs"].update_one(
                {"run_id": run_id, "field_logs.client_id": client_id},
                {"$set": {"field_logs.$": error_entry}}
            )
        return error_entry
