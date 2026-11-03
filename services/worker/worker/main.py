import asyncio
import signal
from worker.config import settings

async def main():
    # TODO: Phase 6 Implementation
    # 1. Connect to Redis & Postgres
    # 2. Join Consumer Group "worker-group"
    # 3. Enter processing loop
    # 4. Handle SIGTERM for graceful shutdown
    print(f"Starting Last Minutes Worker in {settings.ENV} mode")
    
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)
        
    await stop_event.wait()

if __name__ == "__main__":
    asyncio.run(main())
