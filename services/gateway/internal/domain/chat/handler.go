package chat

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/lastminutes/gateway/internal/domain/intelligence"
	"github.com/lastminutes/gateway/internal/middleware"
)

// AI SDK Stream Format Part types
type StreamPartType string

const (
	PartText     StreamPartType = "0"
	PartToolCall StreamPartType = "e"
	PartError    StreamPartType = "3"
)

func WriteTextPart(w io.Writer, text string) {
	data, _ := json.Marshal(text)
	fmt.Fprintf(w, "%s:%s\n", PartText, data)
}

func WriteErrorPart(w io.Writer, errMsg string) {
	data, _ := json.Marshal(errMsg)
	fmt.Fprintf(w, "%s:%s\n", PartError, data)
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type ChatRequest struct {
	Messages    []intelligence.Message `json:"messages"`
	TranscriptID string                 `json:"transcriptId,omitempty"`
}

func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_ = middleware.GetUserID(ctx) // Injected into context via middleware

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var transcriptContext string
	if req.TranscriptID != "" {
		transcriptContext = "[Context: User is viewing a transcript]"
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("X-Vercel-AI-Data", "stream")
	w.WriteHeader(http.StatusOK)

	flusher, _ := w.(http.Flusher)

	provider := intelligence.NewDeepSeekProvider(h.service.cfg)
	stream, err := provider.StreamChat(ctx, h.service.SystemPrompt(transcriptContext), req.Messages)
	if err != nil {
		WriteErrorPart(w, "Failed to start AI stream")
		return
	}

	for chunk := range stream {
		if chunk.Error != nil {
			WriteErrorPart(w, chunk.Error.Error())
			break
		}
		if chunk.Text != "" {
			WriteTextPart(w, chunk.Text)
			flusher.Flush()
		}
	}
}

func (h *Handler) History(w http.ResponseWriter, r *http.Request) {
	// TODO: Fetch from Postgres
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": []interface{}{},
	})
}

func (h *Handler) Threads(w http.ResponseWriter, r *http.Request) {
	// TODO: Fetch from Postgres
	json.NewEncoder(w).Encode(map[string]interface{}{
		"threads": []interface{}{},
	})
}
