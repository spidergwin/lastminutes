import logging
import asyncpg
from typing import Optional
from worker.config import settings

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Initializes the database connection pool using asyncpg"""
        if self._pool:
            return
        
        logger.info("Initializing asyncpg database pool")
        try:
            self._pool = await asyncpg.create_pool(
                dsn=settings.database_url,
                min_size=1,
                max_size=5,  # 12-factor connection pool limit (max 5 connections per container instance)
                max_inactive_connection_lifetime=300.0
            )
            logger.info("PostgreSQL database connection pool established successfully")
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL pool: {e}")
            raise

    async def disconnect(self):
        """Closes the connection pool cleanly during shutdown"""
        if self._pool:
            logger.info("Closing database connection pool")
            await self._pool.close()
            self._pool = None

    @property
    def pool(self) -> asyncpg.Pool:
        if not self._pool:
            raise RuntimeError("Database pool not initialized. Run connect() first.")
        return self._pool

db = Database()
