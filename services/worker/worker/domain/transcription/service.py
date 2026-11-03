import logging
import os
import json
import aiohttp
from typing import Dict, Any, List
from worker.domain.transcription.router import ASRRouter
from worker.events.producer import Producer
from worker.db.postgres import db
from worker.events import streams

logger = logging.getLogger(__name__)

class TranscriptionPipeline:
    def __init__(self, event_producer: Producer):
        self.router = ASRRouter()
        self.producer = event_producer

    async def run(self, meeting_id: str, payload: dict) -> str:
        """Downloads recording, runs ASR, stores segments, and saves final transcript"""
        recording_url = payload.get("recordingUrl")
        user_id = payload.get("userId")

        if not recording_url:
            raise ValueError(f"Recording URL is missing in payload: {payload}")

        logger.info(f"Starting transcription pipeline for meeting: {meeting_id}, User: {user_id}")

        # Create temporary workspace folder for downloads
        tmp_dir = "tmp/recordings"
        os.makedirs(tmp_dir, exist_ok=True)
        local_path = os.path.join(tmp_dir, f"{meeting_id}.wav")

        try:
            # 1. Download recording file
            await self._download_file(recording_url, local_path)

            # 2. Run language detection & routing
            segments = await self.router.route_and_transcribe(local_path, recording_url)
            logger.info(f"Transcription complete. Got {len(segments)} segments for meeting {meeting_id}")

            # 3. Store segments & publish live WebSocket notifications in real-time
            combined_text = []
            word_count = 0
            duration = 0.0

            async with db.pool.acquire() as conn:
                async with conn.transaction():
                    # Generate a unique Transcript ID in CUID/UUID format
                    transcript_id = f"tr_{meeting_id}"

                    for i, seg in enumerate(segments):
                        text = seg.get("text", "").strip()
                        if not text:
                            continue
                        
                        combined_text.append(text)
                        word_count += len(text.split())
                        duration = max(duration, seg.get("end", 0.0))

                        # Save individual segment in transcript_segments table (Phase 4 table)
                        await conn.execute(
                            """
                            INSERT INTO transcript_segments (
                                id, transcript_id, start_time, end_time, speaker, text, language, created_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                            """,
                            f"seg_{meeting_id}_{i}",
                            transcript_id,
                            seg.get("start", 0.0),
                            seg.get("end", 0.0),
                            seg.get("speaker", "Speaker 0"),
                            text,
                            seg.get("language", "en")
                        )

                        # Publish live WS segment updates to Redis Streams (XADD)
                        ws_payload = {
                            "meetingId": meeting_id,
                            "text": text,
                            "speaker": seg.get("speaker", "Speaker 0"),
                            "start": seg.get("start", 0.0),
                            "end": seg.get("end", 0.0),
                            "language": seg.get("language", "en")
                        }
                        await self.producer.publish(streams.StreamTranscriptionSegments, ws_payload)

                    # 4. Save/Upsert completed Transcript record in Database
                    full_text = " ".join(combined_text)
                    speakers = list(set(seg.get("speaker", "Speaker 0") for seg in segments))
                    segments_json = json.dumps(segments)

                    await conn.execute(
                        """
                        INSERT INTO transcripts (
                            id, user_id, title, original_text, source_language, duration, word_count,
                            file_url, file_type, transcribed_at, created_at, updated_at, is_public, segments, speakers
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW(), $10, $11, $12)
                        ON CONFLICT (id) DO UPDATE SET
                            original_text = EXCLUDED.original_text,
                            duration = EXCLUDED.duration,
                            word_count = EXCLUDED.word_count,
                            segments = EXCLUDED.segments,
                            speakers = EXCLUDED.speakers,
                            updated_at = NOW()
                        """,
                        transcript_id,
                        user_id,
                        f"Transcript for {meeting_id}",
                        full_text,
                        segments[0].get("language", "en") if segments else "en",
                        int(duration),
                        word_count,
                        recording_url,
                        "meeting",
                        False,
                        segments_json,
                        speakers
                    )

            logger.info(f"Transcript stored successfully in database: {transcript_id}")
            return transcript_id

        finally:
            # 5. Cleanup local temp file
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Cleaned up temporary recording file: {local_path}")

    async def _download_file(self, url: str, dest: str):
        """Downloads external recording link to local temp path"""
        logger.info(f"Downloading recording from {url} to {dest}")
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Failed to download recording file: HTTP {resp.status}")
                
                with open(dest, "wb") as f:
                    while True:
                        chunk = await resp.content.read(1024 * 1024)
                        if not chunk:
                            break
                        f.write(chunk)
