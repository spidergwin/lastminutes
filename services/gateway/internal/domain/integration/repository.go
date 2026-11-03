package integration

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// FindMeetingByBotID retrieves a meeting schedule using the Recall.ai bot ID
func (r *Repository) FindMeetingByBotID(ctx context.Context, botID string) (string, string, string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT id, user_id, bot_status 
		FROM meetings 
		WHERE bot_id = $1 AND deleted_at IS NULL
		LIMIT 1
	`
	var meetingID, userID, currentStatus string
	err := r.db.QueryRow(ctx, query, botID).Scan(&meetingID, &userID, &currentStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", "", nil
		}
		return "", "", "", err
	}
	return meetingID, userID, currentStatus, nil
}

// UpdateBotStatus updates the status and/or logs any error encountered by the Recall.ai bot
func (r *Repository) UpdateBotStatus(ctx context.Context, meetingID, status string, botErr *string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		UPDATE meetings 
		SET bot_status = $1, bot_error = $2, updated_at = NOW()
		WHERE id = $3 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query, status, botErr, meetingID)
	return err
}

// UpdateRecordingURL sets the finished meeting recording link
func (r *Repository) UpdateRecordingURL(ctx context.Context, meetingID, url string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		UPDATE meetings 
		SET recording_url = $1, bot_status = 'processing', updated_at = NOW()
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query, url, meetingID)
	return err
}
