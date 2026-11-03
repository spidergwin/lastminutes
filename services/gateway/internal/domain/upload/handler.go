package upload

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/lastminutes/gateway/internal/config"
	"github.com/lastminutes/gateway/internal/middleware"
)

type Handler struct {
	cfg *config.Config
}

func NewHandler(cfg *config.Config) *Handler {
	return &Handler{cfg: cfg}
}

type InitiateRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	FileSize    int64  `json:"fileSize"`
}

func (h *Handler) Initiate(w http.ResponseWriter, r *http.Request) {
	var req InitiateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.Filename == "" || req.ContentType == "" || req.FileSize == 0 {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "Missing required fields (filename, contentType, fileSize)")
		return
	}

	// 1. Fallback to Local Mock for Development
	if h.cfg.R2AccessKey == "" || h.cfg.R2AccessKey == "your_access_key" {
		uniqueKey := fmt.Sprintf("%d-%s", time.Now().Unix(), req.Filename)
		
        // Detect protocol and host from request to return a valid absolute URL
        scheme := "http"
        if r.TLS != nil { scheme = "https" }
        host := r.Host

		// We return "gateway" as the type so the frontend hook uses our mock-put
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"type":      "gateway", 
			"uploadUrl": fmt.Sprintf("%s://%s/v1/upload/mock-put?key=%s", scheme, host, uniqueKey),
			"publicUrl": fmt.Sprintf("%s://%s/v1/upload/mock-put?key=%s", scheme, host, uniqueKey),
		})
		return
	}

	// TODO: Implement real R2 presigned URL generation here when keys are present.
	// For now, even with keys, we'll use the gateway type to ensure connectivity works.
	
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"type":      "gateway",
		"uploadUrl": "http://localhost:8080/v1/upload/mock-put",
		"publicUrl": "http://localhost:8080/v1/upload/mock-put",
	})
}

func (h *Handler) MockPut(w http.ResponseWriter, r *http.Request) {
	// Accept the PUT request from the frontend
	// This is where the actual file bytes are sent.
	
	// We don't actually store them in this mock, just satisfy the request.
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}
