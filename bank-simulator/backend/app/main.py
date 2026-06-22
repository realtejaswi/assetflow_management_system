from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.redis_client import close_redis
from app.routers import auth, accounts, transactions, loans, investments, admin
from app.background.price_updater import start_scheduler, stop_scheduler
from app.background.emi_scheduler import start_emi_scheduler, stop_emi_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Bank Simulator API — Simulates a financial institution with accounts, transactions, loans, and investments",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup / Shutdown
@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    start_scheduler()
    start_emi_scheduler()
    logger.info(f"🚀 {settings.app_name} v{settings.version} started")


@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()
    stop_emi_scheduler()
    await close_mongo_connection()
    await close_redis()
    logger.info("👋 Bank Simulator shut down")


# Routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(loans.router)
app.include_router(investments.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "service": "bank-simulator-backend"}
