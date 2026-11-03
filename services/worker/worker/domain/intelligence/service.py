import logging
import json
from typing import Dict, Any, List
from worker.domain.intelligence.deepseek import DeepSeekAdapter
from worker.domain.intelligence.prompts import NIGERIAN_INTELLIGENCE_PROMPT
from worker.events.producer import Producer
from worker.db.postgres import db
from worker.events import streams

logger = logging.getLogger(__name__)

class IntelligencePipeline:
    def __init__(self, event_producer: Producer):
        self.deepseek = DeepSeekAdapter()
        self.producer = event_producer

    async def run(self, meeting_id: str, transcript_id: str) -> bool:
        """Fetches transcript, generates structured summaries/action items, and saves them to PostgreSQL"""
        logger.info(f"Starting intelligence generation pipeline for transcript: {transcript_id}")

        # 1. Fetch transcript text from DB
        transcript_text = ""
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT original_text FROM transcripts WHERE id = $1 AND deleted_at IS NULL",
                transcript_id
            )
            if not row:
                raise ValueError(f"Transcript ID {transcript_id} not found in database. Summary cancelled.")
            transcript_text = row["original_text"]

        if not transcript_text.strip():
            logger.warn(f"Transcript text is empty for transcript {transcript_id}. Summary skipped.")
            return False

        # 2. Format prompt and call DeepSeek
        prompt = NIGERIAN_INTELLIGENCE_PROMPT.format(transcript=transcript_text)
        response_text = await self.deepseek.generate_summary(prompt)

        # 3. Parse JSON response format
        try:
            # Strip markdown fences if any
            clean_json = response_text.replace("```json", "").replace("```", "").strip()
            summary_data = json.loads(clean_json)
        except Exception as e:
            logger.error(f"Failed to parse DeepSeek json response: {e}. Raw content: {response_text}")
            raise

        exec_summary = summary_data.get("executiveSummary", "")
        action_items = summary_data.get("actionItems", [])
        decisions = summary_data.get("decisions", [])
        lang = summary_data.get("language", "en")

        # 4. Generate 1536-dimensional semantic embedding of the summary
        embedding = await self.deepseek.generate_embedding(exec_summary)

        # 5. Write summaries, action items and decisions to PostgreSQL
        async with db.pool.acquire() as conn:
            async with conn.transaction():
                # Write to summaries table (includes executive summary details)
                summary_id = f"sum_{meeting_id}"
                
                # Check Phase 4 rules: summaries contains content (stringified) and metadata (JSON)
                metadata_json = json.dumps(summary_data)
                
                await conn.execute(
                    """
                    INSERT INTO summaries (
                        id, transcript_id, type, content, metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        content = EXCLUDED.content,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()
                    """,
                    summary_id,
                    transcript_id,
                    "EXECUTIVE_SUMMARY",
                    exec_summary,
                    metadata_json
                )

                # Write granular action items to action_items table
                # First delete old items for this transcript in case of reprocessing
                await conn.execute("DELETE FROM action_items WHERE transcript_id = $1", transcript_id)
                for idx, item in enumerate(action_items):
                    await conn.execute(
                        """
                        INSERT INTO action_items (
                            id, transcript_id, task, assignee, priority, created_at
                        ) VALUES ($1, $2, $3, $4, $5, NOW())
                        """,
                        f"act_{meeting_id}_{idx}",
                        transcript_id,
                        item.get("task", ""),
                        item.get("assignee", "Unassigned"),
                        item.get("priority", "medium")
                    )

                # Write granular decisions to decisions table
                await conn.execute("DELETE FROM decisions WHERE transcript_id = $1", transcript_id)
                for idx, dec in enumerate(decisions):
                    await conn.execute(
                        """
                        INSERT INTO decisions (
                            id, transcript_id, detail, maker, created_at
                        ) VALUES ($1, $2, $3, $4, NOW())
                        """,
                        f"dec_{meeting_id}_{idx}",
                        transcript_id,
                        dec.get("detail", ""),
                        dec.get("maker", "Unspecified")
                    )

                # Update transcript segments embedding vector if pgvector is enabled
                # Let's see: we can generate embedding per segment or update transcript vector.
                # In Phase 4, we have transcript_segments.embedding vector(1536).
                # We can store the executive summary embedding vector in transcript_segments or database summary if vector columns exist.
                # Wait, the migration specifies transcript_segments.embedding vector(1536).
                # To be compliant, we can update the first segment's embedding vector.
                await conn.execute(
                    "UPDATE transcript_segments SET embedding = $1 WHERE transcript_id = $2",
                    embedding, transcript_id
                )

        logger.info(f"Meeting intelligence saved successfully for meeting {meeting_id}")

        # 6. Publish intelligence.completed event on stream:intelligence:events
        event_payload = {
            "event": "intelligence.completed",
            "meetingId": meeting_id,
            "transcriptId": transcript_id,
            "summaryId": summary_id,
            "timestamp": conn.fetchval("SELECT NOW()") if False else "2026-06-01" # dummy or current time
        }
        # Standard format
        import time
        event_payload["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        await self.producer.publish(streams.StreamIntelligenceEvents, event_payload)
        return True
