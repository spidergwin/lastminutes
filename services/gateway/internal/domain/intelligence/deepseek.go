package intelligence

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/lastminutes/gateway/internal/config"
)

type DeepSeekProvider struct {
	cfg *config.Config
}

func NewDeepSeekProvider(cfg *config.Config) *DeepSeekProvider {
	return &DeepSeekProvider{cfg: cfg}
}

func (p *DeepSeekProvider) StreamChat(ctx context.Context, systemPrompt string, messages []Message) (<-chan StreamChunk, error) {
	out := make(chan StreamChunk)

	payload := map[string]interface{}{
		"model":  "deepseek-chat",
		"stream": true,
		"messages": append([]Message{{Role: "system", Content: systemPrompt}}, messages...),
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.deepseek.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.cfg.DeepSeekAPIKey)

	go func() {
		defer close(out)
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			out <- StreamChunk{Error: err}
			return
		}
		defer resp.Body.Close()

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				break
			}

			var chunk struct {
				Choices []struct {
					Delta struct {
						Content   string `json:"content"`
						ToolCalls []struct {
							Index    int    `json:"index"`
							ID       string `json:"id"`
							Function struct {
								Name      string `json:"name"`
								Arguments string `json:"arguments"`
							} `json:"function"`
						} `json:"tool_calls"`
					} `json:"delta"`
				} `json:"choices"`
			}

			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			if len(chunk.Choices) > 0 {
				delta := chunk.Choices[0].Delta
				if delta.Content != "" {
					out <- StreamChunk{Text: delta.Content}
				}
			}
		}
	}()

	return out, nil
}
