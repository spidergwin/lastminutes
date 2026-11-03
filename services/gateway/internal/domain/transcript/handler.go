package transcript

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/lastminutes/gateway/internal/middleware"
)

type Handler struct {
	repo    *Repository
	service *Service
}

func NewHandler(repo *Repository, service *Service) *Handler {
	return &Handler{repo: repo, service: service}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 20
	}
	cursor := r.URL.Query().Get("cursor")

	transcripts, nextCursor, hasMore, err := h.repo.List(r.Context(), userID, limit, cursor)
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":        transcripts,
		"next_cursor": nextCursor,
		"has_more":    hasMore,
	})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	// userID := middleware.GetUserID(r.Context())
	// id := chi.URLParam(r, "id")

	// TODO: Implement repo.GetByID
	middleware.RenderError(w, r, "about:blank", "Not Implemented", http.StatusNotImplemented, "Get transcript details not yet implemented")
}

func (h *Handler) GetMedia(w http.ResponseWriter, r *http.Request) {
	// TODO: Generate presigned R2 URL
	json.NewEncoder(w).Encode(map[string]interface{}{
		"url":       "https://placeholder-signed-url.r2.dev/audio.mp3",
		"expiresAt": "2026-06-02T22:00:00Z",
	})
}

func (h *Handler) GetToken(w http.ResponseWriter, r *http.Request) {
	// Returns a temporary Deepgram key (mocked for now)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"key": h.service.cfg.DeepgramAPIKey,
	})
}

func (h *Handler) Transcribe(w http.ResponseWriter, r *http.Request) {
	// Handles direct audio blob transcription via RunPod
	
	// 1. Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "File too large")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "Missing file")
		return
	}
	defer file.Close()

	// TODO: Upload to temporary R2 bucket and get URL
	// For now, we'll return a mock successful response
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"text":    "Transcribed text from Go Gateway using RunPod serverless pipeline (Mocked).",
	})
}

func (h *Handler) TranscribeUpload(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AudioURL string `json:"audio_url"`
		Language string `json:"language"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "Invalid JSON")
		return
	}

	// For local development with mock URLs, we'll return a mock successful response
	if req.AudioURL == "" || strings.Contains(req.AudioURL, "/v1/upload/mock-put") {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"completed": true,
				"text":      "Mock transcription successful for local development.",
				"segments":  []interface{}{},
				"speakers":  []string{"Speaker 1"},
			},
		})
		return
	}

	// Trigger real RunPod for real URLs
	job, err := h.service.TranscribeMedia(r.Context(), req.AudioURL, req.Language)
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"jobId":   job.ID,
	})
}

func (h *Handler) GetUploadStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	result, err := h.service.PollJobStatus(r.Context(), id)
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	completed := result.Status == "COMPLETED"
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"completed": completed,
			"text":      result.Output.Transcript,
			"segments":  result.Output.Segments,
			"speakers":  result.Output.Speakers,
		},
	})
}

