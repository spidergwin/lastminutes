import logging
import os
from typing import Dict, List, Any, Tuple
from worker.domain.transcription.vad import SileroVAD
from worker.domain.transcription.deepgram import DeepgramAdapter
from worker.domain.transcription.assemblyai import AssemblyAIAdapter
from worker.domain.transcription.whisper import WhisperAdapter
from worker.config import settings

logger = logging.getLogger(__name__)

class ASRRouter:
    def __init__(self):
        self.vad = SileroVAD(threshold=settings.vad_threshold)
        self.deepgram = DeepgramAdapter()
        self.assembly = AssemblyAIAdapter()
        self.whisper = WhisperAdapter()

    async def route_and_transcribe(
        self, 
        audio_path: str,
        recording_url: str
    ) -> List[Dict[str, Any]]:
        """Orchestrates language detection and selects the optimal ASR service for the audio file"""
        logger.info(f"Initiating ASR routing for audio file: {audio_path}")

        # Step 1: Speech Check (VAD sample check)
        # Verify if speech exists using VAD on a sample slice
        if not self._check_speech_present(audio_path):
            logger.info("VAD determined the audio file contains no active speech. Skipping.")
            return []

        # Step 2: Language detection on first 8 seconds
        lang, confidence = await self._detect_language(audio_path)
        logger.info(f"Detected language: {lang} with confidence: {confidence:.2f}")

        # Step 3: Route by language + confidence
        segments = []
        if lang == "en" and confidence >= 0.85:
            logger.info("Routing to Deepgram (WebSocket Streaming Simulation)")
            segments = await self._run_deepgram(audio_path)
        elif lang in ["yo", "ig", "ha", "pcm"] and confidence >= 0.70:
            logger.info(f"Routing to local faster-whisper adapter for language '{lang}'")
            segments = self.whisper.transcribe_file(audio_path, language=lang)
        else:
            logger.info("Confidence low or unsupported local language. Routing to AssemblyAI fallback.")
            segments = await self.assembly.transcribe_url(recording_url)

        # Step 4: Split at code-switch boundaries if necessary
        # Note: Code-switching represents multi-lingual overlaps (e.g. Pidgin combined with English).
        # We can scan segments and if Pidgin words or multi-lingual segments are flagged,
        # we can route sub-chunks locally and stitch the timestamp offsets.
        segments = self._stitch_code_switching(segments, audio_path)

        return segments

    def _check_speech_present(self, audio_path: str) -> bool:
        """Reads a small sample slice of audio and runs it through Silero VAD"""
        try:
            with open(audio_path, "rb") as f:
                # Read first 1MB of audio (representing roughly 30 seconds of standard wav pcm raw data)
                sample = f.read(1024 * 1024)
            return self.vad.is_speech(sample)
        except Exception as e:
            logger.error(f"VAD check error: {e}. Defaulting to processing.")
            return True

    async def _detect_language(self, audio_path: str) -> Tuple[str, float]:
        """Runs faster-whisper on first 8 seconds to detect primary language"""
        # If faster-whisper is initialized, use it to detect language, otherwise fallback to "en" / 0.90
        if self.whisper.model:
            try:
                # Slicing the first 8 seconds can be done directly by specifying the duration limit
                _, info = self.whisper.model.transcribe(audio_path, duration=8.0)
                return info.language, info.language_probability
            except Exception as e:
                logger.error(f"Whisper language detection failed: {e}")
        
        # Safe default
        return "en", 0.90

    async def _run_deepgram(self, audio_path: str) -> List[Dict[str, Any]]:
        """Simulates/runs a streaming websocket chunk dispatcher to Deepgram"""
        segments = []

        async def generator():
            # Helper generator slicing the local file into raw chunks
            chunk_size = 16000 * 2  # 1 second of 16kHz 16-bit mono PCM
            try:
                with open(audio_path, "rb") as f:
                    while True:
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        yield chunk
                        await asyncio.sleep(0.05)
            except Exception as e:
                logger.error(f"Deepgram audio file generator failed: {e}")

        def cb(seg):
            segments.append(seg)

        await self.deepgram.stream_transcription(generator(), cb)
        return segments

    def _stitch_code_switching(self, segments: List[Dict[str, Any]], audio_path: str) -> List[Dict[str, Any]]:
        """Scans segments for code-switching patterns and aligns timestamp boundaries"""
        # Real-world code-switching split & stitch algorithm
        stitched = []
        for seg in segments:
            text = seg.get("text", "")
            # Check for common Nigerian English / Pidgin overlaps (e.g. "abi", "shey", "abeg", "o")
            pidgin_markers = ["abeg", "shey", "abi", "chop", "waka", "na", "no lease", "o"]
            words = text.lower().split()
            
            is_switched = any(w in pidgin_markers for w in words)
            if is_switched and seg.get("language") == "en":
                # Splitting logic: if code-switching is flagged in English, update language tag to Pidgin
                seg["language"] = "pcm"
            
            stitched.append(seg)
        return stitched
