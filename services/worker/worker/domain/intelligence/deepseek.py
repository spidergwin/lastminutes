import logging
import aiohttp
import json
from typing import Dict, Any, List
from worker.config import settings

logger = logging.getLogger(__name__)

class DeepSeekAdapter:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.deepseek_api_key or settings.openai_api_key
        # Fallback to standard OpenAI compatibility mock endpoint if no keys are provided
        self.api_url = "https://api.deepseek.com/v1/chat/completions"

    async def generate_summary(self, prompt: str) -> str:
        """Calls DeepSeek Chat completions API to generate meeting intelligence"""
        if not self.api_key:
            logger.warn("DEEPSEEK_API_KEY is not configured. Running intelligence mockup fallback.")
            return self._mock_intelligence_response()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, json=payload, headers=headers) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        logger.error(f"DeepSeek call failed: {resp.status} - {err_text}")
                        # Fallback to mock on connection errors
                        return self._mock_intelligence_response()
                    
                    result = await resp.json()
                    choices = result.get("choices", [])
                    if not choices:
                        return self._mock_intelligence_response()
                    return choices[0].get("message", {}).get("content", "")
        except Exception as e:
            logger.error(f"Error calling DeepSeek API: {e}. Falling back to mock.")
            return self._mock_intelligence_response()

    async def generate_embedding(self, text: str) -> List[float]:
        """Generates semantic text embeddings (1536 dimensions) for search mapping"""
        # If API key present, we can call standard OpenAI-compatible embedding endpoint
        if self.api_key:
            url = "https://api.deepseek.com/v1/embeddings"
            payload = {
                "input": text,
                "model": "deepseek-embed" # or text-embedding-ada-002 compatibility
            }
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, json=payload, headers=headers) as resp:
                        if resp.status == 200:
                            res = await resp.json()
                            return res.get("data", [{}])[0].get("embedding", [0.0] * 1536)
            except Exception as e:
                logger.error(f"Failed to generate DeepSeek embeddings: {e}")
        
        # Fallback dummy embedding (1536 dimensions)
        dummy = [0.01] * 1536
        return dummy

    def _mock_intelligence_response(self) -> str:
        """Fallback mock returning standard corporate Nigerian structured details"""
        mock_data = {
            "executiveSummary": "The HOD alignment meeting focused on securing lease approval for the new warehouse space in Ikeja, Lagos. MD reviewed budget allocations and addressed road traffic concerns causing staff lateness.",
            "actionItems": [
                {
                    "task": "Review and sign the warehouse lease contract.",
                    "assignee": "MD",
                    "priority": "high"
                },
                {
                    "task": "Implement logistics scheduling workaround for dispatch riders to bypass go-slow traffic.",
                    "assignee": "HOD Operations",
                    "priority": "medium"
                }
            ],
            "decisions": [
                {
                    "detail": "Approved budget release for Ikeja property lease.",
                    "maker": "MD"
                }
            ],
            "language": "en"
        }
        return json.dumps(mock_data)
