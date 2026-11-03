import logging
import numpy as np

logger = logging.getLogger(__name__)

class SileroVAD:
    def __init__(self, model_path: str = None, threshold: float = 0.3):
        self.threshold = threshold
        self._model = None
        self._onnx_session = None
        
        if model_path:
            try:
                import onnxruntime as ort
                self._onnx_session = ort.InferenceSession(model_path)
                logger.info("Silero VAD ONNX model session initialized successfully")
            except Exception as e:
                logger.warn(f"Failed to load ONNX runtime or model: {e}. Falling back to default speech detection.")

    def get_speech_probability(self, audio_data: bytes) -> float:
        """Calculates speech probability of input audio chunk using ONNX model or raw power estimate fallback"""
        if self._onnx_session:
            try:
                # Silero VAD expects float32 array, 16kHz, mono
                audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
                
                # Reshape for Silero input (batch_size=1, samples)
                if len(audio_np) == 0:
                    return 0.0
                
                inputs = {
                    "input": np.expand_dims(audio_np, axis=0),
                    "sr": np.array([16000], dtype=np.int64)
                }
                out = self._onnx_session.run(None, inputs)
                prob = out[0][0][0]
                return float(prob)
            except Exception as e:
                logger.error(f"Silero ASR VAD inference failed: {e}. Using raw power estimate.")
        
        # Fallback: Simple RMS energy calculation to estimate probability
        try:
            samples = np.frombuffer(audio_data, dtype=np.int16)
            if len(samples) == 0:
                return 0.0
            rms = np.sqrt(np.mean(samples.astype(np.float64)**2))
            # Rough scaling: maps RMS [0, 5000] to speech probability [0, 1]
            prob = min(rms / 5000.0, 1.0)
            return prob
        except Exception:
            return 0.5 # Safe default if audio buffer cannot be parsed

    def is_speech(self, audio_data: bytes) -> bool:
        """Skip chunk entirely if speech probability is below the threshold"""
        prob = self.get_speech_probability(audio_data)
        logger.debug(f"VAD Speech Probability: {prob:.4f}")
        return prob >= self.threshold
