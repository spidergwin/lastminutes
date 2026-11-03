package events

// Redis Stream name constants
const (
	StreamMeetingEvents       = "stream:meeting:events"       // publishes meeting.created, meeting.started, meeting.ended, meeting.cancelled
	StreamTranscriptionSegments = "stream:transcription:segments" // publishes real-time segments (transcription.segment)
	StreamTranscriptionEvents   = "stream:transcription:events"   // publishes transcription.completed
	StreamIntelligenceEvents    = "stream:intelligence:events"    // publishes intelligence.completed
)
