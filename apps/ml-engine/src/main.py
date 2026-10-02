from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.core.database import engine, Base
from src.api.v1 import train, forecast

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup
    await engine.dispose()

app = FastAPI(
    title="XGBoost ML Engine",
    description="Trading Stack ML Engine with XGBoost, FastAPI, and SQLAlchemy v2",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(train.router, prefix="/api/v1/train", tags=["Train"])
app.include_router(forecast.router, prefix="/api/v1/forecast", tags=["Forecast"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
