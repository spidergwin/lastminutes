package transcript

import (
	"time"
	"github.com/google/uuid"
)

type Transcript struct {
	ID             uuid.UUID `json:"id"`
	UserID         string    `json:"user_id"`
	MeetingID      *uuid.UUID `json:"meeting_id,omitempty"`
	Title          string    `json:"title"`
	OriginalText   string    `json:"original_text"`
	SourceLanguage string    `json:"source_language"`
	Duration       int       `json:"duration"`
	WordCount      int       `json:"word_count"`
	FileURL        string    `json:"file_url,omitempty"`
	FileType       string    `json:"file_type,omitempty"`
	Speakers       []string  `json:"speakers"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Segment struct {
	ID           uuid.UUID `json:"id"`
	TranscriptID uuid.UUID `json:"transcript_id"`
	StartTime    float64   `json:"start_time"`
	EndTime      float64   `json:"end_time"`
	Speaker      string    `json:"speaker"`
	Text         string    `json:"text"`
	Language     string    `json:"language"`
}

// RunPod Specific Types
type RunPodInput struct {
	AudioURL      string `json:"audio_url"`
	Model         string `json:"model" default:"sbpn-nigerian"`
	Diarization   bool   `json:"diarization" default:"true"`
	SourceLang    string `json:"source_lang,omitempty"`
}

type RunPodJobResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type RunPodResult struct {
	Status string `json:"status"`
	Output struct {
		Transcript string    `json:"transcript"`
		Segments   []Segment `json:"segments"`
		Speakers   []string  `json:"speakers"`
	} `json:"output"`
}
