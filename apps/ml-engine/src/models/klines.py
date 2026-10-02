from sqlalchemy import Column, String, BigInteger, DateTime
from sqlalchemy.sql import func
from src.core.database import Base

class KlinesFutures(Base):
    __tablename__ = 'klines_futures'

    symbol = Column(String, primary_key=True)
    interval = Column(String, primary_key=True)
    openTime = Column(BigInteger, primary_key=True)
    
    closeTime = Column(BigInteger)
    open = Column(String)
    high = Column(String)
    low = Column(String)
    close = Column(String)
    baseVolume = Column(String)
    quoteVolume = Column(String)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)

class KlinesSpot(Base):
    __tablename__ = 'klines_spot'

    symbol = Column(String, primary_key=True)
    interval = Column(String, primary_key=True)
    openTime = Column(BigInteger, primary_key=True)
    
    closeTime = Column(BigInteger)
    open = Column(String)
    high = Column(String)
    low = Column(String)
    close = Column(String)
    baseVolume = Column(String)
    quoteVolume = Column(String)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)
