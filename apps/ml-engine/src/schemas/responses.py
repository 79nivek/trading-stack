from pydantic import BaseModel
from typing import Optional

class TrainResponse(BaseModel):
    success: bool
    message: str
    file_name: Optional[str] = None
    from_time: Optional[int] = None
    to_time: Optional[int] = None
    is_incremental: bool = False

class ForecastItem(BaseModel):
    openTime: int
    trend: str
    price: float
    min_price: float
    max_price: float
    confidence: float

class ForecastResponse(BaseModel):
    success: bool
    symbol: str
    timeFrame: str
    quantity: int
    forecasts: list[ForecastItem]
    message: str = ""
