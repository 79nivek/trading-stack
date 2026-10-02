from sqlalchemy import Column, String, BigInteger, DateTime, Integer
from sqlalchemy.sql import func
from src.core.database import Base

class TrainingHistory(Base):
    __tablename__ = 'training_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, index=True, nullable=False)
    time_frame = Column(String, index=True, nullable=False)
    from_time = Column(BigInteger, nullable=False)
    to_time = Column(BigInteger, nullable=False)
    file_name = Column(String, nullable=False)
    market_type = Column(String, nullable=False) # 'spot' or 'futures'

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
