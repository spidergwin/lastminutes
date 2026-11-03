package intelligence

import (
	"context"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ToolCall struct {
	ID       string `json:"id"`
	Function string `json:"name"`
	Args     string `json:"arguments"`
}

type StreamChunk struct {
	Text     string
	ToolCall *ToolCall
	Error    error
}

type Provider interface {
	StreamChat(ctx context.Context, systemPrompt string, messages []Message) (<-chan StreamChunk, error)
}
