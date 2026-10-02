from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.schemas.responses import ForecastResponse
from src.repositories.klines_repository import KlinesFuturesRepository
from src.repositories.training_history_repository import TrainingHistoryRepository
from src.services.binance_service import BinanceService
from src.services.xgboost_service import XGBoostService

router = APIRouter()

@router.get("/futures", response_model=ForecastResponse, summary="Forecast next N candles for Futures")
async def forecast_futures(
    symbol: str = Query(..., description="The trading symbol (e.g., BTCUSDT)", examples="BTCUSDT"),
    timeFrame: str = Query(..., description="The timeframe (e.g., 1h, 4h, 1d)", examples="1h"),
    quantity: int = Query(3, description="Number of candles to predict", ge=1, le=20, examples=[3]),
    db: AsyncSession = Depends(get_db)
):
    """
    Forecast the trend and price of the next N candles using the trained XGBoost model.
    """
    klines_repo = KlinesFuturesRepository(db)
    history_repo = TrainingHistoryRepository(db)
    binance_service = BinanceService(klines_repo)
    xgboost_service = XGBoostService(klines_repo, history_repo, binance_service)

    result = await xgboost_service.forecast(symbol, timeFrame, quantity=quantity)
    return result
