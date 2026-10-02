import requests
import asyncio
from src.repositories.klines_repository import KlinesFuturesRepository
from src.utils.time_utils import get_current_timestamp_ms

class BinanceService:
    BASE_URL = "https://fapi.binance.com/fapi/v1"

    def __init__(self, klines_repo: KlinesFuturesRepository):
        self.klines_repo = klines_repo

    async def fetch_and_save_missing_klines(self, symbol: str, interval: str, from_time: int, to_time: int):
        """
        Fetches klines from Binance if they are missing in the database.
        Binance limit is 1000 per request.
        """
        current_from = from_time
        all_klines = []

        while current_from < to_time:
            # We want to fetch up to 1000 klines starting from current_from
            url = f"{self.BASE_URL}/klines?symbol={symbol}&interval={interval}&limit=1000&startTime={current_from}"
            
            # Using synchronous requests in async block for simplicity, but ideally use httpx
            # To avoid blocking event loop, we can use asyncio.to_thread
            response = await asyncio.to_thread(requests.get, url)
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch from Binance: {response.text}")
                
            data = response.json()
            if not data:
                break
                
            entities = []
            for item in data:
                entities.append({
                    "symbol": symbol,
                    "interval": interval,
                    "openTime": item[0],
                    "closeTime": item[6],
                    "open": str(item[1]),
                    "high": str(item[2]),
                    "low": str(item[3]),
                    "close": str(item[4]),
                    "baseVolume": str(item[5]),
                    "quoteVolume": str(item[7])
                })
            
            await self.klines_repo.upsert_klines(entities)
            
            last_open_time = data[-1][0]
            if last_open_time >= to_time or len(data) < 1000:
                break
                
            # next start time is slightly after the last open time
            current_from = last_open_time + 1
            
            # rate limiting protection
            await asyncio.sleep(0.1)

    async def get_klines(self, symbol: str, interval: str, from_time: int, to_time: int):
        # 1. Check database for latest kline
        latest_time = await self.klines_repo.get_latest_kline_time(symbol, interval)
        
        # 2. If DB doesn't have enough data, fetch from binance
        if latest_time == 0:
            # No data at all, fetch from from_time to to_time
            await self.fetch_and_save_missing_klines(symbol, interval, from_time, to_time)
        elif latest_time < to_time:
            # We have some data, but need more recent data
            # Binance requires startTime. Let's fetch from latest_time + 1
            await self.fetch_and_save_missing_klines(symbol, interval, latest_time + 1, to_time)
            
        # 3. Retrieve the full range from DB
        return await self.klines_repo.get_klines_in_range(symbol, interval, from_time, to_time)
