package meeting

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/lastminutes/gateway/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 20
	}
	cursor := r.URL.Query().Get("cursor")

	meetings, nextCursor, hasMore, err := h.service.ListMeetings(r.Context(), userID, limit, cursor)
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":        meetings,
		"next_cursor": nextCursor,
		"has_more":    hasMore,
	})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.RenderError(w, r, "about:blank", "Bad Request", http.StatusBadRequest, "Invalid JSON")
		return
	}

	m, err := h.service.ScheduleMeeting(r.Context(), userID, &req)
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	m, err := h.service.GetMeeting(r.Context(), id, userID)
	if err != nil {
		middleware.RenderError(w, r, "about:blank", "Not Found", http.StatusNotFound, "Meeting not found")
		return
	}

	json.NewEncoder(w).Encode(m)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.service.CancelMeeting(r.Context(), id, userID); err != nil {
		middleware.RenderError(w, r, "about:blank", "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}
