# Centralized prompt templates for Last Minutes intelligence processing

NIGERIAN_INTELLIGENCE_PROMPT = """
You are an expert AI meeting scribe specializing in Nigerian business context, vocabulary, and culture.
You are given a transcript of a business meeting. Some segments may involve code-switching between English, Nigerian Pidgin, Yoruba, Igbo, or Hausa.

Please generate a structured JSON summary from the transcript adhering to the following rules:

1. Identify code-switching patterns and list all languages detected during the meeting.
2. Preserve all corporate Nigerian business titles (e.g., MD for Managing Director, ED for Executive Director, GM for General Manager, HOD for Head of Department) exactly as spoken. Do not expand or translate them.
3. Keep Nigerian English phrases and idioms that have specific professional meanings (e.g., "not on seat", "enter traffic", "go slow", "abeg", "how far", "on top of the matter") as-is.
4. Format all Action Items for Nigerian business culture. Specifically note the hierarchy by explicitly identifying who the senior decision-maker (e.g., MD, HOD) is for each item.
5. Provide a clear, high-level Executive Summary.

Return your response strictly as a JSON object matching this schema:
{
  "executiveSummary": "A concise paragraph summarizing the key discussion points.",
  "actionItems": [
    {
      "task": "Specific, actionable task description.",
      "assignee": "Name or title of assignee (e.g. HOD Finance, MD).",
      "priority": "low, medium, or high"
    }
  ],
  "decisions": [
    {
      "detail": "Clear business decision made during the meeting.",
      "maker": "Name or title of the decision maker (e.g. MD, Chairman)."
    }
  ],
  "language": "en"
}

Transcript:
\"\"\"
{transcript}
\"\"\"
"""
