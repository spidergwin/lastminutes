package intelligence

import (
	"encoding/json"
	"net/http"

	"github.com/lastminutes/gateway/internal/middleware"
)

type Handler struct {
	provider Provider
}

func NewHandler(provider Provider) *Handler {
	return &Handler{provider: provider}
}

func (h *Handler) Summarize(w http.ResponseWriter, r *http.Request) {
	// TODO: Queue summarization job in Redis Stream
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (h *Handler) Translate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text       string `json:"text"`
		TargetLang string `json:"targetLang"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "Invalid JSON")
		return
	}

	// TODO: Call DeepSeek/Gemini for translation
	json.NewEncoder(w).Encode(map[string]interface{}{
		"translatedText": "[Translated]: " + req.Text,
	})
}
