package events

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type Publisher struct {
	rdb *redis.Client
}

func NewPublisher(rdb *redis.Client) *Publisher {
	return &Publisher{rdb: rdb}
}

// Publish appends a new message event to the specified Redis Stream (XADD stream_name * values...)
func (p *Publisher) Publish(ctx context.Context, stream string, data map[string]interface{}) error {
	// Convert map to key-value pairs required by Redis go-redis client
	values := make(map[string]interface{})
	for k, v := range data {
		values[k] = fmt.Sprintf("%v", v)
	}

	err := p.rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		MaxLen: 10000, // Capped stream size for memory conservation
		Approx: true,
		ID:     "*", // Auto-generated message ID
		Values: values,
	}).Err()

	return err
}
