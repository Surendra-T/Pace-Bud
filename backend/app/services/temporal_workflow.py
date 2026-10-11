import logging
from typing import Optional, Dict, Any
from app.core.config import settings
from app.services.field_log_pipeline import process_field_log_pipeline

logger = logging.getLogger(__name__)

# Temporal activities and workflow definition
# Will be used if USE_TEMPORAL is enabled, otherwise gracefully skipped
try:
    from temporalio import activity, workflow
    from temporalio.client import Client

    @activity.defn
    async def process_field_log_activity(params: Dict[str, Any]) -> Dict[str, Any]:
        return await process_field_log_pipeline(
            run_id=params["run_id"],
            client_id=params["client_id"],
            file_path=params.get("file_path"),
            raw_text=params.get("raw_text"),
            file_size_bytes=params.get("file_size_bytes", 0)
        )

    @workflow.defn
    class ProcessFieldLogWorkflow:
        @workflow.run
        async def run(self, params: Dict[str, Any]) -> Dict[str, Any]:
            from datetime import timedelta
            return await workflow.execute_activity(
                process_field_log_activity,
                params,
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=workflow.RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=2),
                    backoff_coefficient=2.0
                )
            )

    TEMPORAL_AVAILABLE = True
except ImportError:
    TEMPORAL_AVAILABLE = False
    logger.info("temporalio package not installed; running in standard inline background processing mode.")

async def dispatch_temporal_field_log(
    run_id: str,
    client_id: str,
    file_path: Optional[str] = None,
    raw_text: Optional[str] = None,
    file_size_bytes: int = 0
) -> bool:
    """
    Submits field log to Temporal server if enabled and available.
    Returns True if scheduled via Temporal, False if caller should fall back to inline BackgroundTasks.
    """
    if not settings.USE_TEMPORAL or not TEMPORAL_AVAILABLE:
        return False

    try:
        from temporalio.client import Client
        client = await Client.connect(settings.TEMPORAL_HOST)
        await client.start_workflow(
            ProcessFieldLogWorkflow.run,
            {
                "run_id": run_id,
                "client_id": client_id,
                "file_path": file_path,
                "raw_text": raw_text,
                "file_size_bytes": file_size_bytes
            },
            id=f"fieldlog-{client_id}",
            task_queue=settings.TEMPORAL_TASK_QUEUE
        )
        logger.info(f"Dispatched Temporal workflow for {client_id}")
        return True
    except Exception as e:
        logger.warning(f"Temporal dispatch failed ({e}). Falling back to inline BackgroundTask.")
        return False
