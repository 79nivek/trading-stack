from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.schemas.responses import TrainResponse
from src.repositories.klines_repository import KlinesFuturesRepository
from src.repositories.training_history_repository import TrainingHistoryRepository
from src.services.binance_service import BinanceService
from src.services.xgboost_service import XGBoostService

router = APIRouter()

@router.get("/futures", response_model=TrainResponse, summary="Train XGBoost model for Futures")
async def train_futures(
    symbol: str = Query(..., description="The trading symbol (e.g., BTCUSDT)", examples="BTCUSDT"),
    timeFrame: str = Query(..., description="The timeframe (e.g., 1h, 4h, 1d)", examples="1h"),
    reset: bool = Query(False, description="Reset and train from scratch if True, otherwise resume training", examples=False),
    db: AsyncSession = Depends(get_db)
):
    """
    Train an XGBoost model using historical klines data.
    If a model already exists and reset is False, it will resume training (incremental) using new data.
    If reset is True, it drops the existing model and trains from scratch.
    """
    klines_repo = KlinesFuturesRepository(db)
    history_repo = TrainingHistoryRepository(db)
    binance_service = BinanceService(klines_repo)
    xgboost_service = XGBoostService(klines_repo, history_repo, binance_service)

    result = await xgboost_service.train_model(symbol, timeFrame, reset=reset)
    return result
