package integration

import "time"

// RecallWebhookRequest represents a Recall.ai webhook payload with full event metadata
type RecallWebhookRequest struct {
	Event string             `json:"event"`
	Data  *RecallWebhookData `json:"data"`
}

type RecallWebhookData struct {
	ID        string             `json:"id"` // Bot ID
	BotID     string             `json:"bot_id,omitempty"` // Alternative mapping field
	Status    *RecallStatusField `json:"status,omitempty"`
	Recording *RecallRecording   `json:"recording,omitempty"`
}

type RecallStatusField struct {
	Code    string  `json:"code"` // e.g. "joining", "recording", "done", "fatal"
	Message *string `json:"message,omitempty"`
}

type RecallRecording struct {
	URL *string `json:"url,omitempty"`
}

// BotActionTrigger defines control signals to send to the active Recall bot (e.g. mute, leave)
type BotActionTrigger struct {
	Action string `json:"action"` // "leave", "mute", "unmute", "send_chat"
	Chat   string `json:"chat,omitempty"`
}

// CalendarConnection holds external Google/Microsoft token details
type CalendarConnection struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Provider      string    `json:"provider"`
	AccessToken   string    `json:"accessToken"`
	RefreshToken  *string   `json:"refreshToken,omitempty"`
	TokenExpiry   time.Time `json:"tokenExpiry"`
	CalendarEmail string    `json:"calendarEmail"`
	Enabled       bool      `json:"enabled"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
