from pydantic import BaseModel, Field

class TrainRequest(BaseModel):
    symbol: str = Field(..., description="The trading symbol (e.g., BTCUSDT)", example="BTCUSDT")
    timeFrame: str = Field(..., description="The timeframe (e.g., 1h, 4h, 1d)", example="1h")

class ForecastRequest(BaseModel):
    symbol: str = Field(..., description="The trading symbol (e.g., BTCUSDT)", example="BTCUSDT")
    timeFrame: str = Field(..., description="The timeframe (e.g., 1h, 4h, 1d)", example="1h")
