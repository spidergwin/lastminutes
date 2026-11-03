import logging
import aiohttp
import asyncio
from typing import Dict, List, Any
from worker.config import settings

logger = logging.getLogger(__name__)

class AssemblyAIAdapter:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.assemblyai_api_key
        self.base_url = "https://api.assemblyai.com/v2"

    async def transcribe_url(self, audio_url: str) -> List[Dict[str, Any]]:
        """Submits audio URL to AssemblyAI for batch transcription with diarization, polling for completion"""
        if not self.api_key:
            logger.error("AssemblyAI API Key is missing. Transcribe failed.")
            return []

        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "audio_url": audio_url,
            "speaker_labels": True, # Diarization enabled
            "dual_channel": False
        }

        logger.info(f"Submitting audio URL to AssemblyAI: {audio_url}")

        async with aiohttp.ClientSession() as session:
            # 1. Submit job
            async with session.post(f"{self.base_url}/transcript", json=payload, headers=headers) as resp:
                if resp.status != 200:
                    err_txt = await resp.text()
                    raise RuntimeError(f"AssemblyAI submission failed with status {resp.status}: {err_txt}")
                
                result = await resp.json()
                transcript_id = result.get("id")

            # 2. Poll for completion
            logger.info(f"AssemblyAI transcript job created: ID={transcript_id}. Polling for completion...")
            while True:
                async with session.get(f"{self.base_url}/transcript/{transcript_id}", headers=headers) as check_resp:
                    check_result = await check_resp.json()
                    status = check_result.get("status")

                    if status == "completed":
                        logger.info("AssemblyAI transcription completed successfully")
                        return self._parse_assembly_utterances(check_result)
                    elif status == "error":
                        error_msg = check_result.get("error", "Unknown AssemblyAI error")
                        logger.error(f"AssemblyAI transcription failed: {error_msg}")
                        raise RuntimeError(f"AssemblyAI transcription error: {error_msg}")

                    logger.debug("AssemblyAI job still processing... sleeping 5 seconds")
                    await asyncio.sleep(5)

    def _parse_assembly_utterances(self, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extracts and standardizes utterances from AssemblyAI response payload"""
        utterances = result.get("utterances", [])
        parsed_segments = []

        for utt in utterances:
            parsed_segments.append({
                "start": float(utt.get("start", 0)) / 1000.0, # convert milliseconds to seconds
                "end": float(utt.get("end", 0)) / 1000.0,
                "speaker": f"Speaker {utt.get('speaker', 'A')}",
                "text": utt.get("text", ""),
                "language": result.get("language_code", "en")
            })

        # Fallback if no utterances diarized
        if not parsed_segments and result.get("text"):
            parsed_segments.append({
                "start": 0.0,
                "end": float(result.get("audio_duration", 0)),
                "speaker": "Speaker 0",
                "text": result.get("text"),
                "language": result.get("language_code", "en")
            })

        return parsed_segments
