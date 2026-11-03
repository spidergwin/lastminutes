package integration

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/lastminutes/gateway/internal/config"
	"github.com/lastminutes/gateway/internal/domain/transcript"
)

type WebhookHandler struct {
	cfg               *config.Config
	transcriptService *transcript.Service
}

func NewWebhookHandler(cfg *config.Config, ts *transcript.Service) *WebhookHandler {
	return &WebhookHandler{cfg: cfg, transcriptService: ts}
}

func (h *WebhookHandler) Recall(w http.ResponseWriter, r *http.Request) {
	// 1. Verify Signature
	signature := r.Header.Get("X-Recall-Signature")
	body, err := ioReadAll(r.Body)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if !h.verifySignature(body, signature) {
		slog.Warn("invalid recall webhook signature")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var event struct {
		Event string `json:"event"`
		Data  struct {
			ID     string `json:"id"`
			Status struct {
				Code string `json:"code"`
			} `json:"status"`
			Recording struct {
				URL string `json:"url"`
			} `json:"recording"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "Malformed payload", http.StatusBadRequest)
		return
	}

	slog.Info("received recall webhook", "event", event.Event, "bot_id", event.Data.ID)

	// 2. Handle Recording Done -> Trigger RunPod
	if event.Event == "bot.done" || event.Event == "bot.recording.done" {
		recordingURL := event.Data.Recording.URL
		if recordingURL != "" {
			go func() {
				slog.Info("triggering RunPod transcription", "bot_id", event.Data.ID)
				_, err := h.transcriptService.TranscribeMedia(context.Background(), recordingURL, "en")
				if err != nil {
					slog.Error("failed to trigger RunPod", "error", err)
				}
			}()
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true}`))
}

func (h *WebhookHandler) verifySignature(payload []byte, signature string) bool {
	if h.cfg.RecallWebhookSecret == "" {
		return true // Allow in dev
	}
	mac := hmac.New(sha256.New, []byte(h.cfg.RecallWebhookSecret))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}

func ioReadAll(r io.Reader) ([]byte, error) {
	var buf bytes.Buffer
	_, err := buf.ReadFrom(r)
	return buf.Bytes(), err
}
