package integration

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/lastminutes/gateway/internal/events"
)

type Service struct {
	repo           *Repository
	eventPublisher *events.Publisher
}

func NewService(repo *Repository, eventPublisher *events.Publisher) *Service {
	return &Service{
		repo:           repo,
		eventPublisher: eventPublisher,
	}
}

// ProcessRecallWebhook processes status codes and pushes events to Redis Streams
func (s *Service) ProcessRecallWebhook(ctx context.Context, payload *RecallWebhookRequest) error {
	if payload == nil || payload.Data == nil {
		return errors.New("webhook payload is empty")
	}

	botID := payload.Data.ID
	if botID == "" {
		botID = payload.Data.BotID
	}
	if botID == "" {
		return errors.New("missing bot id in webhook payload")
	}

	// Lookup meeting linked to this bot ID
	meetingID, userID, currentStatus, err := s.repo.FindMeetingByBotID(ctx, botID)
	if err != nil {
		return fmt.Errorf("failed to lookup meeting for bot %s: %w", botID, err)
	}
	if meetingID == "" {
		slog.Warn("Recall webhook received for untracked bot ID", "botId", botID)
		return nil
	}

	slog.Info("Recall Webhook received", "event", payload.Event, "botId", botID, "meetingId", meetingID)

	switch payload.Event {
	case "bot.status_change":
		if payload.Data.Status == nil {
			return errors.New("missing status field in status_change event")
		}

		recallCode := payload.Data.Status.Code
		internalStatus := mapRecallStatusToInternal(recallCode)

		slog.Info("Recall bot status change", "recallCode", recallCode, "internalStatus", internalStatus, "meetingId", meetingID)

		var botErr *string
		if recallCode == "fatal" {
			botErr = payload.Data.Status.Message
		}

		if err := s.repo.UpdateBotStatus(ctx, meetingID, internalStatus, botErr); err != nil {
			return fmt.Errorf("failed to update bot status: %w", err)
		}

		// Trigger pub/sub events if transitioning to active
		if internalStatus == "recording" && currentStatus != "recording" {
			eventPayload := map[string]interface{}{
				"event":     "meeting.started",
				"meetingId": meetingID,
				"userId":    userID,
				"timestamp": time.Now().Format(time.RFC3339),
			}
			_ = s.eventPublisher.Publish(ctx, events.StreamMeetingEvents, eventPayload)
		}

	case "bot.recording.done", "bot.done":
		// Bot finished recording, trigger the async transcription pipeline
		slog.Info("Recall recording complete, capturing recording URL", "meetingId", meetingID)

		recordingURL := ""
		if payload.Data.Recording != nil && payload.Data.Recording.URL != nil {
			recordingURL = *payload.Data.Recording.URL
		}

		if recordingURL != "" {
			if err := s.repo.UpdateRecordingURL(ctx, meetingID, recordingURL); err != nil {
				return fmt.Errorf("failed to save recording URL: %w", err)
			}
		} else {
			_ = s.repo.UpdateBotStatus(ctx, meetingID, "failed", stringPtr("Missing recording URL from Recall callback"))
		}

		// Publish meeting.ended event to Redis Streams (triggers Python worker transcription job)
		eventPayload := map[string]interface{}{
			"event":        "meeting.ended",
			"meetingId":    meetingID,
			"userId":       userID,
			"recordingUrl": recordingURL,
			"timestamp":    time.Now().Format(time.RFC3339),
		}
		_ = s.eventPublisher.Publish(ctx, events.StreamMeetingEvents, eventPayload)
	}

	return nil
}

// Helpers
func mapRecallStatusToInternal(code string) string {
	switch code {
	case "ready", "scheduled":
		return "scheduled"
	case "joining":
		return "joining"
	case "recording":
		return "recording"
	case "done":
		return "processing"
	case "fatal":
		return "failed"
	default:
		return "idle"
	}
}

func stringPtr(s string) *string {
	return &s
}
