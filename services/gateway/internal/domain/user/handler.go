package user

import (
	"encoding/json"
	"net/http"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Usage(w http.ResponseWriter, r *http.Request) {
	// TODO: Fetch real usage from DB
	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_minutes":     120,
		"used_minutes":      45,
		"remaining_minutes": 75,
		"plan":              "free",
	})
}
