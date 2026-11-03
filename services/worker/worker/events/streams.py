"""
Redis Stream name constants — single source of truth for the Python worker.
Must stay in sync with services/gateway/internal/events/streams.go.
"""

StreamMeetingEvents = "stream:meeting:events"
StreamTranscriptionSegments = "stream:transcription:segments"
StreamTranscriptionEvents = "stream:transcription:events"
StreamIntelligenceEvents = "stream:intelligence:events"
