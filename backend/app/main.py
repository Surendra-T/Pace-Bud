import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pacebud")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Pace-Bud backend...")
    await connect_to_mongo()
    yield
    logger.info("Shutting down Pace-Bud backend...")
    await close_mongo_connection()

app = FastAPI(
    title="Pace-Bud API",
    version="1.0.0",
    description="Mindful outdoor running companion for desk workers with daylight awareness and stoic conciergerie.",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in settings.cors_origins_list else settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

# Serve uploaded field audio files statically for playback
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {
        "app": "Pace-Bud",
        "version": "1.0.0",
        "tagline": "Step away from the screen into the gold of dusk.",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
