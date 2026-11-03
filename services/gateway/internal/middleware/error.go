package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type ProblemDetails struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail"`
	Instance string `json:"instance,omitempty"`
}

func RenderError(w http.ResponseWriter, r *http.Request, problemType string, title string, status int, detail string) {
	slog.Error("request failed", "path", r.URL.Path, "status", status, "error", detail)
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	
	json.NewEncoder(w).Encode(ProblemDetails{
		Type:     problemType,
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
	})
}
