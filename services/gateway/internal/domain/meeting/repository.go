package meeting

import (
	"context"
	"fmt"
	"time"

	"github.com/lastminutes/gateway/internal/db"
)

type Repository struct {
	db *db.Postgres
}

func NewRepository(db *db.Postgres) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByUserID(ctx context.Context, userID string, limit int, cursor string) ([]*Meeting, string, bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, "", false, fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "SELECT set_config('app.user_id', $1, true)", userID)
	if err != nil {
		return nil, "", false, fmt.Errorf("setting RLS context: %w", err)
	}

	var meetings []*Meeting
	query := `
		SELECT id, user_id, title, start_time, end_time, bot_status, meeting_url, created_at, updated_at
		FROM meetings
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY start_time ASC
		LIMIT $2
	`
	rows, err := tx.Query(ctx, query, userID, limit+1)
	if err != nil {
		return nil, "", false, fmt.Errorf("querying meetings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var m Meeting
		err := rows.Scan(&m.ID, &m.UserID, &m.Title, &m.StartTime, &m.EndTime, &m.BotStatus, &m.MeetingURL, &m.CreatedAt, &m.UpdatedAt)
		if err != nil {
			return nil, "", false, fmt.Errorf("scanning meeting: %w", err)
		}
		meetings = append(meetings, &m)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, "", false, fmt.Errorf("committing transaction: %w", err)
	}

	hasMore := len(meetings) > limit
	var nextCursor string
	if hasMore {
		meetings = meetings[:limit]
		nextCursor = meetings[len(meetings)-1].ID.String()
	}

	return meetings, nextCursor, hasMore, nil
}

func (r *Repository) GetByID(ctx context.Context, id, userID string) (*Meeting, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "SET LOCAL app.user_id = $1", userID)
	if err != nil {
		return nil, fmt.Errorf("setting RLS context: %w", err)
	}

	var m Meeting
	query := `
		SELECT id, user_id, title, start_time, end_time, bot_status, meeting_url, created_at, updated_at
		FROM meetings
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	err = tx.QueryRow(ctx, query, id, userID).
		Scan(&m.ID, &m.UserID, &m.Title, &m.StartTime, &m.EndTime, &m.BotStatus, &m.MeetingURL, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("committing transaction: %w", err)
	}

	return &m, nil
}

func (r *Repository) Create(ctx context.Context, m *Meeting) error {
	query := `
		INSERT INTO meetings (user_id, title, start_time, end_time, meeting_url, platform, auto_join_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, bot_status, created_at, updated_at
	`
	return r.db.Pool.QueryRow(ctx, query, m.UserID, m.Title, m.StartTime, m.EndTime, m.MeetingURL, m.Platform, m.AutoJoinEnabled).
		Scan(&m.ID, &m.BotStatus, &m.CreatedAt, &m.UpdatedAt)
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	query := `UPDATE meetings SET deleted_at = now() WHERE id = $1 AND user_id = $2`
	_, err := r.db.Pool.Exec(ctx, query, id, userID)
	return err
}

func (r *Repository) GetTranscriptByMeetingID(ctx context.Context, meetingID, userID string) (*TranscriptStub, error) { return nil, nil }
func (r *Repository) GetSummaryByMeetingID(ctx context.Context, meetingID, userID string) (*SummaryStub, error)    { return nil, nil }

type TranscriptStub struct{}
type SummaryStub struct{}
