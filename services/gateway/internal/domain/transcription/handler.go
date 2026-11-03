package transcription

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"jobId":   "job_placeholder_id",
		"status":  "queued",
		"message": "Transcription submitted. Poll for results using the jobId.",
	})
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"id":     jobID,
			"status": "completed",
			"text":   "Lagos is a nice place. Eko o ni baje.",
		},
	})
}

func (h *Handler) Token(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"key":       "deepgram_mock_key_expired_after_10min",
		"expiresAt": time.Now().Add(10 * time.Minute).Format(time.RFC3339),
	})
}
