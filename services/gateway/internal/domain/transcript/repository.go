package transcript

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

func (r *Repository) List(ctx context.Context, userID string, limit int, cursor string) ([]Transcript, string, bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Use a transaction to ensure SET LOCAL applies to the query
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, "", false, fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "SELECT set_config('app.user_id', $1, true)", userID)
	if err != nil {
		return nil, "", false, fmt.Errorf("setting RLS context: %w", err)
	}

	var transcripts []Transcript
	query := `
		SELECT id, user_id, title, original_text, source_language, duration, word_count, file_url, file_type, speakers, created_at, updated_at
		FROM transcripts
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := tx.Query(ctx, query, userID, limit+1)
	if err != nil {
		return nil, "", false, fmt.Errorf("querying transcripts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var t Transcript
		err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.OriginalText, &t.SourceLanguage, &t.Duration, &t.WordCount, &t.FileURL, &t.FileType, &t.Speakers, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			return nil, "", false, fmt.Errorf("scanning transcript: %w", err)
		}
		transcripts = append(transcripts, t)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, "", false, fmt.Errorf("committing transaction: %w", err)
	}

	hasMore := len(transcripts) > limit
	var nextCursor string
	if hasMore {
		transcripts = transcripts[:limit]
		nextCursor = transcripts[len(transcripts)-1].ID.String()
	}

	return transcripts, nextCursor, hasMore, nil
}

func (r *Repository) Create(ctx context.Context, t *Transcript) error {
	query := `
		INSERT INTO transcripts (user_id, title, original_text, source_language, duration, word_count, file_url, file_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`
	return r.db.Pool.QueryRow(ctx, query, t.UserID, t.Title, t.OriginalText, t.SourceLanguage, t.Duration, t.WordCount, t.FileURL, t.FileType).
		Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
}
