import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
        db.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=4000)
        db.db = db.client[settings.MONGODB_DB]
        # Quick ping to verify connectivity
        await db.client.admin.command('ping')
        logger.info("Connected successfully to MongoDB.")

        # Ensure collections and indexes
        runs_col = db.db["runs"]
        await runs_col.create_index("run_id", unique=True)
        await runs_col.create_index("user_id")
        await runs_col.create_index("created_at")

        # Time-series collection for biometrics
        existing_cols = await db.db.list_collection_names()
        if "biometrics" not in existing_cols:
            try:
                await db.db.create_collection(
                    "biometrics",
                    timeseries={
                        "timeField": "timestamp",
                        "metaField": "run_id",
                        "granularity": "minutes"
                    }
                )
                logger.info("Created biometrics time-series collection.")
            except Exception as e:
                # If timeseries collection creation is not supported or already exists
                logger.warning(f"Note on biometrics timeseries creation: {e}")
                
        biometrics_col = db.db["biometrics"]
        await biometrics_col.create_index([("run_id", 1), ("timestamp", -1)])
        await biometrics_col.create_index("user_id")

    except Exception as e:
        logger.warning(f"Could not establish live connection to MongoDB ({e}). Offline/fallback mock mode will be supported where appropriate.")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection.")

def get_database():
    return db.db
