package meeting

import (
	"context"
	"fmt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) ScheduleMeeting(ctx context.Context, userID string, req *CreateRequest) (*Meeting, error) {
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	platform := "custom"
	if req.MeetingURL != "" {
		platform = "other"
	}

	botStatus := "idle"
	if req.AutoJoinEnabled {
		botStatus = "scheduled"
	}

	m := &Meeting{
		UserID:          userID,
		Title:           req.Title,
		Description:     &req.Description,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		MeetingURL:      &req.MeetingURL,
		Platform:        &platform,
		AutoJoinEnabled: req.AutoJoinEnabled,
		BotStatus:       botStatus,
	}

	if err := s.repo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("failed to schedule meeting in DB: %w", err)
	}

	return m, nil
}

func (s *Service) GetMeeting(ctx context.Context, id, userID string) (*Meeting, error) {
	return s.repo.GetByID(ctx, id, userID)
}

func (s *Service) ListMeetings(ctx context.Context, userID string, limit int, cursor string) ([]*Meeting, string, bool, error) {
	return s.repo.ListByUserID(ctx, userID, limit, cursor)
}

func (s *Service) CancelMeeting(ctx context.Context, id, userID string) error {
	return s.repo.Delete(ctx, id, userID)
}

func (s *Service) GetTranscript(ctx context.Context, meetingID, userID string) (*TranscriptStub, error) {
	return s.repo.GetTranscriptByMeetingID(ctx, meetingID, userID)
}

func (s *Service) GetSummary(ctx context.Context, meetingID, userID string) (*SummaryStub, error) {
	return s.repo.GetSummaryByMeetingID(ctx, meetingID, userID)
}
