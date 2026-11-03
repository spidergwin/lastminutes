import logging
import json
import asyncio
import websockets
from typing import Callable, Optional
from worker.config import settings

logger = logging.getLogger(__name__)

class DeepgramAdapter:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.deepgram_api_key
        self.ws_url = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&diarize=true"

    async def stream_transcription(
        self, 
        audio_generator, 
        segment_callback: Callable[[dict], None]
    ):
        """Connects to Deepgram WebSocket and sends audio stream, returning segments in real-time"""
        if not self.api_key:
            logger.error("Deepgram API Key is missing. Stream failed.")
            return

        headers = {
            "Authorization": f"Token {self.api_key}"
        }

        try:
            async with websockets.connect(self.ws_url, extra_headers=headers) as ws:
                logger.info("Connected to Deepgram ASR streaming WebSocket")
                
                # Background task to receive transcripts from Deepgram
                async def receive_transcripts():
                    try:
                        async for message in ws:
                            response = json.loads(message)
                            
                            # Parse segments
                            channel = response.get("channel", {})
                            alternatives = channel.get("alternatives", [{}])
                            alt = alternatives[0]
                            transcript = alt.get("transcript", "")
                            
                            if transcript:
                                logger.info(f"Deepgram streamed text: {transcript}")
                                segment_callback({
                                    "text": transcript,
                                    "speaker": "Speaker 0", # Default speaker unless diarized in alternative
                                    "start": alt.get("words", [{}])[0].get("start", 0.0),
                                    "end": alt.get("words", [{}])[-1].get("end", 0.0),
                                    "language": "en"
                                })
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("Deepgram receive WebSocket closed cleanly")
                    except Exception as e:
                        logger.error(f"Error in Deepgram receive task: {e}")

                recv_task = asyncio.create_task(receive_transcripts())

                # Send audio chunks in a loop
                try:
                    async for chunk in audio_generator:
                        await ws.send(chunk)
                        # Yield to event loop to keep WebSocket receive alive
                        await asyncio.sleep(0.01)
                finally:
                    # Send close signal to Deepgram
                    await ws.send(json.dumps({"type": "CloseStream"}))
                    await recv_task
        except Exception as e:
            logger.error(f"Failed to connect or stream with Deepgram: {e}")
            raise
