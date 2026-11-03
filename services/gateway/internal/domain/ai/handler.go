package ai

import (
	"encoding/json"
	"net/http"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Translate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"translatedText": "Translation mockup",
			"provider":       "DeepSeek",
		},
	})
}

func (h *Handler) Summarize(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":               "summary_placeholder_id",
		"executiveSummary": "Summary mockup",
		"actionItems":      []interface{}{},
		"decisions":        []interface{}{},
	})
}

func (h *Handler) DeleteSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

func (h *Handler) GetUsage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"usage": map[string]interface{}{
			"monthlyDictationMins: ": 0,
			"monthlyUploadMins":      0,
			"monthlyTranslations":    0,
			"totalDictationMins":     0,
			"totalUploadMins":        0,
			"totalTranslations":      0,
		},
		"subscription": map[string]interface{}{
			"plan":   "FREE",
			"status": "ACTIVE",
		},
		"monthlyTranscripts": 0,
	})
}
