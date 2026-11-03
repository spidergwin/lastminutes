package main

import (
	"errors"
	"log/slog"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/lastminutes/gateway/internal/config"
)

func main() {
	cfg, err := config.LoadMigrate()
	if err != nil {
		slog.Error("failed to load migrate config", "error", err)
		os.Exit(1)
	}

	m, err := migrate.New(
		"file:///migrations",
		cfg.DatabaseURL,
	)
	if err != nil {
		slog.Error("failed to initialize migration", "error", err)
		os.Exit(1)
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	slog.Info("database migrations applied successfully")
}
