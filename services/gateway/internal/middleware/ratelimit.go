package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimit implements a standard Redis-backed fixed-window rate limiter (e.g. max 100 requests per minute)
func RateLimit(rdb *redis.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract client identifier (use authenticated User ID if present, otherwise Remote Address IP)
			identifier := r.RemoteAddr
			if userID, ok := r.Context().Value(ContextKeyUserID).(string); ok && userID != "" {
				identifier = userID
			}

			ctx := r.Context()
			key := fmt.Sprintf("ratelimit:%s:%d", identifier, time.Now().Minute())

			count, err := rdb.Incr(ctx, key).Result()
			if err == nil && count == 1 {
				// First request in the minute, set 59-second expiry
				rdb.Expire(ctx, key, 59*time.Second)
			}

			// Check limit (120 requests per minute as default safe baseline)
			limit := int64(120)
			if err == nil && count > limit {
				RenderError(w, r, "https://lastminutes.ng/errors/rate-limit", "Rate Limit Exceeded", http.StatusTooManyRequests, "You have exceeded the maximum allowed requests of 120 per minute. Please wait before retrying.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
