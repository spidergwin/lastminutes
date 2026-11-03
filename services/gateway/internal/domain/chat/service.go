package chat

import (
	"github.com/lastminutes/gateway/internal/config"
	"github.com/lastminutes/gateway/internal/db"
)

type Service struct {
	cfg *config.Config
	db  *db.Postgres
}

func NewService(cfg *config.Config, database *db.Postgres) *Service {
	return &Service{
		cfg: cfg,
		db:  database,
	}
}

func (s *Service) SystemPrompt(transcriptContext string) string {
	prompt := `You are the Last Minutes AI Assistant, specialized in Nigerian business meetings.
Rules:
1. Preserve Nigerian business titles (MD, ED, GM, HOD, Chairman).
2. Understand and preserve Nigerian English (Pidgin) contexts like "How far?", "Oya", "E don set".
3. Identify senior decision-makers based on their titles.
4. If a transcript is provided, only answer based on that content.`

	if transcriptContext != "" {
		prompt += "\n\nTranscript Context:\n" + transcriptContext
	}
	return prompt
}
