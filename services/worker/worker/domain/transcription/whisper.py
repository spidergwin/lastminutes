import logging
from typing import Dict, List, Any, Optional
from worker.config import settings

logger = logging.getLogger(__name__)

class WhisperAdapter:
    def __init__(self, model_size: str = None):
        self.model_size = model_size or settings.whisper_model
        self.model = None

        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading faster-whisper model: {self.model_size}")
            # Run model on CPU by default with float32 or int8
            self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            logger.info("faster-whisper model loaded successfully")
        except Exception as e:
            logger.warn(f"Failed to import faster-whisper or load model {self.model_size}: {e}. Local Whisper execution will fallback to mock.")

    def transcribe_file(self, audio_path: str, language: Optional[str] = None) -> List[Dict[str, Any]]:
        """Transcribes local audio file using faster-whisper model"""
        if self.model:
            try:
                segments, info = self.model.transcribe(audio_path, beam_size=5, language=language)
                logger.info(f"Whisper transcription done. Detected language: {info.language} with probability {info.language_probability:.2f}")

                results = []
                for s in segments:
                    results.append({
                        "start": float(s.start),
                        "end": float(s.end),
                        "speaker": "Speaker 0", # Default fallback (faster-whisper doesn't diarize natively)
                        "text": s.text.strip(),
                        "language": info.language
                    })
                return results
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
                raise

        # Fallback simulation for local development runs without CUDA/Torch dependencies
        logger.info(f"[Whisper Mock] Transcribing local audio path: {audio_path} in language: {language}")
        return [
            {
                "start": 0.0,
                "end": 30.0,
                "speaker": "Speaker 0",
                "text": "Lagos reviews the project alignment metrics as requested by the MD.",
                "language": language or "en"
            }
        ]
