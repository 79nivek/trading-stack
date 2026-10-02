from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from src.models.klines import KlinesFutures

class KlinesFuturesRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_klines_in_range(self, symbol: str, interval: str, from_time: int, to_time: int):
        stmt = select(KlinesFutures).where(
            KlinesFutures.symbol == symbol,
            KlinesFutures.interval == interval,
            KlinesFutures.openTime >= from_time,
            KlinesFutures.openTime <= to_time
        ).order_by(KlinesFutures.openTime.asc())
        
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_latest_kline_time(self, symbol: str, interval: str) -> int:
        stmt = select(KlinesFutures.openTime).where(
            KlinesFutures.symbol == symbol,
            KlinesFutures.interval == interval
        ).order_by(KlinesFutures.openTime.desc()).limit(1)
        
        result = await self.session.execute(stmt)
        latest = result.scalar()
        return latest or 0

    async def upsert_klines(self, klines_data: list[dict]):
        if not klines_data:
            return
            
        stmt = pg_insert(KlinesFutures).values(klines_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=['symbol', 'interval', 'openTime'],
            set_={
                'closeTime': stmt.excluded.closeTime,
                'open': stmt.excluded.open,
                'high': stmt.excluded.high,
                'low': stmt.excluded.low,
                'close': stmt.excluded.close,
                'baseVolume': stmt.excluded.baseVolume,
                'quoteVolume': stmt.excluded.quoteVolume,
            }
        )
        await self.session.execute(stmt)
        await self.session.commit()
