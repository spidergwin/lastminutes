package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewHandler(db *pgxpool.Pool, rdb *redis.Client) *Handler {
	return &Handler{
		db:    db,
		redis: rdb,
	}
}

// Check pings PostgreSQL and Redis to verify full gateway operational health
func (h *Handler) Check(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	// Check DB
	dbErr := h.db.Ping(ctx)
	
	// Check Redis
	redisErr := h.redis.Ping(ctx).Err()

	status := "ok"
	statusCode := http.StatusOK

	components := map[string]string{
		"database": "healthy",
		"redis":    "healthy",
	}

	if dbErr != nil {
		status = "error"
		statusCode = http.StatusServiceUnavailable
		components["database"] = "unhealthy: " + dbErr.Error()
	}

	if redisErr != nil {
		status = "error"
		statusCode = http.StatusServiceUnavailable
		components["redis"] = "unhealthy: " + redisErr.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := map[string]interface{}{
		"status":     status,
		"version":    "1.0.0",
		"components": components,
	}
	_ = json.NewEncoder(w).Encode(response)
}

// In case context package is required but missing, wait, let's look at imports:
// We need to import context! Yes! Let's import "context" in imports.
