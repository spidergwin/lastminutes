package config

import (
	"os"
)

type MigrateConfig struct {
	DatabaseURL string
}

func LoadMigrate() (*MigrateConfig, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, os.ErrNotExist
	}
	return &MigrateConfig{DatabaseURL: dbURL}, nil
}
