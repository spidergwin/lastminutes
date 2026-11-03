import logging
import asyncio
import socket
from typing import Callable, Awaitable
from redis.asyncio import Redis
from worker.db.postgres import db

logger = logging.getLogger(__name__)

class Consumer:
    def __init__(self, rdb: Redis):
        self.rdb = rdb
        self.group = "worker-group"
        # Unique consumer name per instance/container hostname
        self.name = f"worker-{socket.gethostname()}"
        self.running = False

    async def register_group(self, stream: str):
        """Ensures the consumer group is registered, recovering last ID checkpoint from Postgres database if available"""
        last_id = "0"
        
        # 1. Look up stream checkpoint from DB
        try:
            async with db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT last_id FROM stream_checkpoints WHERE stream_name = $1 AND consumer_group = $2",
                    stream, self.group
                )
                if row:
                    last_id = row["last_id"]
                    logger.info(f"Loaded checkpoint for stream {stream}: {last_id}")
        except Exception as e:
            logger.warn(f"Failed to query stream_checkpoints from database: {e}. Falling back to default '0'")

        # 2. Register group on Redis Stream
        try:
            # We want to create group starting at last_id if stream exists, or create empty stream
            # Wait, XGROUP CREATE requires $ or message ID.
            # Using XGROUP CREATE with ID creates group at that ID.
            await self.rdb.xgroup_create(stream, self.group, id=last_id, mkstream=True)
            logger.info(f"Created consumer group {self.group} on stream {stream} at ID {last_id}")
        except Exception as e:
            if "BUSYGROUP" in str(e):
                # Group already exists
                pass
            else:
                logger.error(f"XGROUP CREATE failed: {e}")
                raise

    async def update_checkpoint(self, stream: str, msg_id: str):
        """Updates last read checkpoint in Postgres database"""
        try:
            async with db.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO stream_checkpoints (stream_name, consumer_group, last_id, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (stream_name, consumer_group)
                    DO UPDATE SET last_id = EXCLUDED.last_id, updated_at = NOW()
                    """,
                    stream, self.group, msg_id
                )
        except Exception as e:
            logger.error(f"Failed to update stream checkpoint in database: {e}")

    async def listen(
        self, 
        stream: str, 
        handler: Callable[[str, dict], Awaitable[None]]
    ):
        """Background loop reading from Redis Stream group and processing events"""
        await self.register_group(stream)
        self.running = True
        logger.info(f"Listening loop started for stream {stream}")

        while self.running:
            try:
                # Read new message blocking
                streams = await self.rdb.xreadgroup(
                    groupname=self.group,
                    consumername=self.name,
                    streams={stream: ">"},
                    count=1,
                    block=0  # Wait indefinitely
                )

                if not streams:
                    continue

                for s_name, messages in streams:
                    for msg_id, values in messages:
                        # Convert byte keys/values to strings
                        data = {k.decode("utf-8"): v.decode("utf-8") for k, v in values.items()}
                        
                        logger.info(f"Event received from {stream}: ID={msg_id.decode('utf-8')}")
                        
                        # Call handler
                        try:
                            # Await processing logic (transcription or summarization)
                            await handler(meeting_id=data.get("meetingId"), payload=data)
                            
                            # Acknowledge completion
                            msg_id_str = msg_id.decode("utf-8")
                            await self.rdb.xack(stream, self.group, msg_id_str)
                            
                            # Update DB Checkpoint
                            await self.update_checkpoint(stream, msg_id_str)
                        except Exception as handler_err:
                            logger.error(f"Handler processing failed for message {msg_id}: {handler_err}")
                            # Let message remain in pending list to allow retry or processing by another worker

            except asyncio.CancelledError:
                logger.info(f"Listener loop on stream {stream} cancelled gracefully")
                break
            except Exception as e:
                logger.error(f"Stream consumer error: {e}. Backoff 2s before retry")
                await asyncio.sleep(2)
