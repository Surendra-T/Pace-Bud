import asyncio
import logging
from app.core.config import settings

logger = logging.getLogger("pacebud-worker")

async def run_worker():
    logging.basicConfig(level=logging.INFO)
    logger.info("Initializing Pace-Bud Temporal Worker...")
    
    if not settings.USE_TEMPORAL:
        logger.info("USE_TEMPORAL is false. Worker is idle or opt-in only. To enable, set USE_TEMPORAL=true.")
        return

    try:
        from temporalio.client import Client
        from temporalio.worker import Worker
        from app.services.temporal_workflow import ProcessFieldLogWorkflow, process_field_log_activity
        
        logger.info(f"Connecting to Temporal host {settings.TEMPORAL_HOST}...")
        client = await Client.connect(settings.TEMPORAL_HOST)
        worker = Worker(
            client,
            task_queue=settings.TEMPORAL_TASK_QUEUE,
            workflows=[ProcessFieldLogWorkflow],
            activities=[process_field_log_activity]
        )
        logger.info(f"Temporal Worker listening on queue: {settings.TEMPORAL_TASK_QUEUE}")
        await worker.run()
    except Exception as e:
        logger.error(f"Temporal worker failed to start or connect: {e}")

if __name__ == "__main__":
    asyncio.run(run_worker())
