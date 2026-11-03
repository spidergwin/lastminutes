package meeting

import (
	"errors"
	"time"
	"github.com/google/uuid"
)

type Meeting struct {
	ID              uuid.UUID  `json:"id"`
	UserID          string     `json:"user_id"`
	ExternalEventID string     `json:"external_event_id,omitempty"`
	Title           string     `json:"title"`
	Description     *string    `json:"description,omitempty"`
	StartTime       time.Time  `json:"start_time"`
	EndTime         time.Time  `json:"end_time"`
	MeetingURL      *string    `json:"meeting_url,omitempty"`
	Platform        *string    `json:"platform,omitempty"`
	Organizer       string     `json:"organizer,omitempty"`
	AutoJoinEnabled bool       `json:"auto_join_enabled"`
	BotStatus       string     `json:"bot_status"`
	BotID           string     `json:"bot_id,omitempty"`
	BotError        string     `json:"bot_error,omitempty"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CreateRequest struct {
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	StartTime       time.Time `json:"startTime"`
	EndTime         time.Time `json:"endTime"`
	MeetingURL      string    `json:"meetingUrl"`
	AutoJoinEnabled bool      `json:"autoJoinEnabled"`
}

func (r *CreateRequest) Validate() error {
	if r.Title == "" {
		return errors.New("title is required")
	}
	if r.StartTime.IsZero() {
		return errors.New("start time is required")
	}
	return nil
}
