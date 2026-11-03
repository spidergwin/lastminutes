import logging
from typing import Dict, Any
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

class Producer:
    def __init__(self, rdb: Redis):
        self.rdb = rdb

    async def publish(self, stream: str, data: Dict[str, Any]):
        """Publishes event data to a Redis Stream via XADD"""
        # Convert dictionary values to strings for standard Redis Stream consumption
        flat_data = {k: str(v) for k, v in data.items() if v is not None}
        
        try:
            msg_id = await self.rdb.xadd(
                name=stream,
                fields=flat_data,
                maxlen=10000,
                approximate=True
            )
            logger.debug(f"Event published to {stream} successfully with message ID: {msg_id}")
            return msg_id
        except Exception as e:
            logger.error(f"Failed to publish event to stream {stream}: {e}")
            raise
