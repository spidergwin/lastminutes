package main

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/lastminutes/gateway/internal/config"
	"github.com/lastminutes/gateway/internal/db"
	mw "github.com/lastminutes/gateway/internal/middleware"
	
	"github.com/lastminutes/gateway/internal/domain/chat"
	"github.com/lastminutes/gateway/internal/domain/meeting"
	"github.com/lastminutes/gateway/internal/domain/transcript"
	"github.com/lastminutes/gateway/internal/domain/upload"
	"github.com/lastminutes/gateway/internal/domain/intelligence"
	"github.com/lastminutes/gateway/internal/domain/integration"
	"github.com/lastminutes/gateway/internal/domain/user"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	database, err := db.NewPostgres(cfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	// Load Better Auth Public Key for JWT validation
	if err := loadPublicKey(cfg, database); err != nil {
		slog.Warn("failed to load public key from DB, falling back to symmetric secret", "error", err)
	}

	// Initialize Repositories
	meetingRepo := meeting.NewRepository(database)
	transcriptRepo := transcript.NewRepository(database)

	// Initialize Services
	transcriptService := transcript.NewService(cfg)
	chatService := chat.NewService(cfg, database)
	intelProvider := intelligence.NewDeepSeekProvider(cfg)

	// Initialize Handlers
	meetingHandler := meeting.NewHandler(meeting.NewService(meetingRepo))
	transcriptHandler := transcript.NewHandler(transcriptRepo, transcriptService)
	chatHandler := chat.NewHandler(chatService)
	uploadHandler := upload.NewHandler(cfg)
	intelHandler := intelligence.NewHandler(intelProvider)
	webhookHandler := integration.NewWebhookHandler(cfg, transcriptService)
	userHandler := user.NewHandler()

	r := chi.NewRouter()

	// Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(mw.CORS)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	// Public Webhooks & Mocks
	r.Post("/webhooks/recall", webhookHandler.Recall)
	r.Put("/v1/upload/mock-put", uploadHandler.MockPut)

	// Authenticated Routes
	r.Group(func(r chi.Router) {
		r.Use(mw.Auth(cfg))
		
		// Chat
		r.Post("/v1/chat", chatHandler.Chat)
		r.Get("/v1/chat/history", chatHandler.History)
		r.Get("/v1/chat/threads", chatHandler.Threads)
		
		// Meetings
		r.Get("/v1/meetings", meetingHandler.List)
		r.Post("/v1/meetings", meetingHandler.Create)
		r.Get("/v1/meetings/{id}", meetingHandler.Get)
		r.Delete("/v1/meetings/{id}", meetingHandler.Delete)

		// Transcripts
		r.Get("/v1/transcripts", transcriptHandler.List)
		r.Get("/v1/transcripts/{id}", transcriptHandler.Get)
		r.Get("/v1/transcripts/{id}/media", transcriptHandler.GetMedia)
		r.Post("/v1/transcription/token", transcriptHandler.GetToken)
		r.Post("/v1/transcription/upload", transcriptHandler.TranscribeUpload)
		r.Get("/v1/transcription/upload/{id}", transcriptHandler.GetUploadStatus)
		r.Post("/v1/transcribe", transcriptHandler.Transcribe)

		// Uploads
		r.Post("/v1/upload/initiate", uploadHandler.Initiate)

		// User
		r.Get("/v1/usage", userHandler.Usage)

		// Intelligence
		r.Post("/v1/summarize", intelHandler.Summarize)
		r.Post("/v1/translate", intelHandler.Translate)
	})

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		slog.Info("starting gateway server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("failed to start server", "error", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("failed to shutdown server", "error", err)
	}

	slog.Info("gateway server stopped")
}

func loadPublicKey(cfg *config.Config, database *db.Postgres) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var jwkRaw string
	err := database.Pool.QueryRow(ctx, `SELECT "publicKey" FROM jwks LIMIT 1`).Scan(&jwkRaw)
	if err != nil {
		return fmt.Errorf("querying jwks table: %w", err)
	}

	var jwk struct {
		X string `json:"x"`
	}
	if err := json.Unmarshal([]byte(jwkRaw), &jwk); err != nil {
		return fmt.Errorf("parsing jwk json: %w", err)
	}

	pubKeyBytes, err := base64.RawURLEncoding.DecodeString(jwk.X)
	if err != nil {
		return fmt.Errorf("decoding public key: %w", err)
	}

	if len(pubKeyBytes) != ed25519.PublicKeySize {
		return fmt.Errorf("invalid public key size: expected %d, got %d", ed25519.PublicKeySize, len(pubKeyBytes))
	}

	cfg.PublicKey = ed25519.PublicKey(pubKeyBytes)
	slog.Info("auth: successfully loaded Ed25519 public key")
	return nil
}
