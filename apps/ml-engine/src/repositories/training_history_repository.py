from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from src.models.training_history import TrainingHistory

class TrainingHistoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_latest_history(self, symbol: str, time_frame: str, market_type: str = 'futures'):
        stmt = select(TrainingHistory).where(
            TrainingHistory.symbol == symbol,
            TrainingHistory.time_frame == time_frame,
            TrainingHistory.market_type == market_type
        ).order_by(TrainingHistory.to_time.desc()).limit(1)
        
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_history(self, history: TrainingHistory):
        self.session.add(history)
        await self.session.commit()
        await self.session.refresh(history)
        return history

    async def update_history(self, history_id: int, new_to_time: int):
        stmt = update(TrainingHistory).where(
            TrainingHistory.id == history_id
        ).values(to_time=new_to_time)
        await self.session.execute(stmt)
        await self.session.commit()

    async def delete_history(self, history_id: int):
        from sqlalchemy import delete
        stmt = delete(TrainingHistory).where(
            TrainingHistory.id == history_id
        )
        await self.session.execute(stmt)
        await self.session.commit()
