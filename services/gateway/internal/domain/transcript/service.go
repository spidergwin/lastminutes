package transcript

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/lastminutes/gateway/internal/config"
)

type Service struct {
	cfg *config.Config
}

func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

// TranscribeMedia calls the RunPod Serverless API to process the audio/video file.
// It uses faster-whisper + SBPN models for Nigerian ASR and Pyannote 3.1 for diarization.
func (s *Service) TranscribeMedia(ctx context.Context, audioURL string, language string) (*RunPodJobResponse, error) {
	input := RunPodInput{
		AudioURL:    audioURL,
		Model:       "sbpn-nigerian", // Hardcoded to use your preferred model
		Diarization: true,
		SourceLang:  language,
	}

	payload := map[string]interface{}{
		"input": input,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://api.runpod.ai/v2/%s/run", s.cfg.RunPodEndpointID)
	
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.cfg.RunPodAPIKey))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("runpod api returned status: %d", resp.StatusCode)
	}

	var jobResponse RunPodJobResponse
	if err := json.NewDecoder(resp.Body).Decode(&jobResponse); err != nil {
		return nil, err
	}

	return &jobResponse, nil
}

// PollJobStatus checks the status of the transcription job on RunPod.
func (s *Service) PollJobStatus(ctx context.Context, jobID string) (*RunPodResult, error) {
	url := fmt.Sprintf("https://api.runpod.ai/v2/%s/status/%s", s.cfg.RunPodEndpointID, jobID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.cfg.RunPodAPIKey))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result RunPodResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}
