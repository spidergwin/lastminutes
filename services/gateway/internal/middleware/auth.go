package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lastminutes/gateway/internal/config"
)

type contextKey string

const ContextKeyUserID contextKey = "user_id"
const ContextKeyUserRole contextKey = "user_role"

func Auth(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				slog.Warn("auth: missing authorization header")
				http.Error(w, "Unauthorized: Missing token", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				slog.Warn("auth: invalid authorization header format", "header", authHeader)
				http.Error(w, "Unauthorized: Invalid format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				alg, _ := token.Header["alg"].(string)
				
				// Better Auth defaults to EdDSA for JWT plugin
				if alg == "EdDSA" {
					if cfg.PublicKey == nil {
						slog.Error("auth: token uses EdDSA but public key is not loaded")
						return nil, jwt.ErrSignatureInvalid
					}
					return cfg.PublicKey, nil
				}

				// Fallback to HS256 (Symmetric) if token uses it
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
					return []byte(cfg.AuthSecret), nil
				}

				slog.Warn("auth: unexpected signing method", "alg", alg)
				return nil, jwt.ErrSignatureInvalid
			})

			if err != nil {
				slog.Warn("auth: token validation failed", "error", err, "token_preview", tokenString[:min(10, len(tokenString))]+"...")
				http.Error(w, "Unauthorized: Invalid or expired token", http.StatusUnauthorized)
				return
			}

			if !token.Valid {
				slog.Warn("auth: token is invalid")
				http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				slog.Warn("auth: invalid token claims")
				http.Error(w, "Unauthorized: Invalid claims", http.StatusUnauthorized)
				return
			}

			// Better Auth JWT claims
			userId, _ := claims["sub"].(string)
			role, _ := claims["role"].(string)

			slog.Debug("auth: user authenticated", "userId", userId, "role", role)

			ctx := context.WithValue(r.Context(), ContextKeyUserID, userId)
			ctx = context.WithValue(ctx, ContextKeyUserRole, role)
			
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) string {
	if id, ok := ctx.Value(ContextKeyUserID).(string); ok {
		return id
	}
	return ""
}
