package config

import (
	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Env          string `envconfig:"ENV" default:"development"`
	Port         int    `envconfig:"PORT" default:"8080"`
	DatabaseURL  string `envconfig:"DATABASE_URL" required:"true"`
	RedisURL     string `envconfig:"REDIS_URL" required:"true"`
	AuthSecret   string `envconfig:"BETTER_AUTH_SECRET" required:"true"`
	PublicKey    interface{} // Loaded at runtime from DB

	// RunPod Serverless Config (ASR)
	RunPodAPIKey     string `envconfig:"RUNPOD_API_KEY" required:"true"`
	RunPodEndpointID string `envconfig:"RUNPOD_ENDPOINT_ID" required:"true"`

	// AI Providers (Chat & Intelligence)
	AIProvider    string `envconfig:"AI_PROVIDER" default:"deepseek"`
	DeepSeekAPIKey string `envconfig:"DEEPSEEK_API_KEY"`
	GeminiAPIKey   string `envconfig:"GOOGLE_GENERATIVE_AI_API_KEY"`

	// Transcription
	DeepgramAPIKey string `envconfig:"DEEPGRAM_API_KEY"`

	// Storage (R2)
	R2AccessKey    string `envconfig:"R2_ACCESS_KEY_ID"`
	R2SecretKey    string `envconfig:"R2_SECRET_ACCESS_KEY"`
	R2BucketName   string `envconfig:"R2_BUCKET_NAME" default:"lastminutes-uploads"`
	R2PublicDomain string `envconfig:"R2_PUBLIC_DOMAIN"`

	// Third Party
	RecallAPIKey        string `envconfig:"RECALL_API_KEY"`
	RecallWebhookSecret string `envconfig:"RECALL_WEBHOOK_SECRET"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
