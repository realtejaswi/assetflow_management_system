from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import dashboard, expenses

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="AssetFlow Management System — Financial Intelligence & Analytics API",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    logger.info(f"🚀 {settings.app_name} v{settings.version} started")


@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()


# Routers
app.include_router(dashboard.router)
app.include_router(expenses.router)


@app.get("/")
async def root():
    return {"service": settings.app_name, "version": settings.version, "status": "running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "assetflow-backend"}
