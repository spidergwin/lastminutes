package events

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Consumer struct {
	rdb    *redis.Client
	dbPool *pgxpool.Pool
	group  string
	name   string
}

func NewConsumer(rdb *redis.Client, dbPool *pgxpool.Pool) *Consumer {
	host, err := os.Hostname()
	if err != nil {
		host = "gateway-instance"
	}
	return &Consumer{
		rdb:    rdb,
		dbPool: dbPool,
		group:  "gateway-group",
		name:   fmt.Sprintf("gateway-%s", host),
	}
}

// Start initiates background consumer group listening on Redis Streams
func (c *Consumer) Start(ctx context.Context) {
	// Create consumer groups if they don't exist
	c.createGroup(ctx, StreamTranscriptionEvents)
	c.createGroup(ctx, StreamIntelligenceEvents)

	go c.loop(ctx, StreamTranscriptionEvents, c.handleTranscriptionCompleted)
	go c.loop(ctx, StreamIntelligenceEvents, c.handleIntelligenceCompleted)
}

func (c *Consumer) createGroup(ctx context.Context, stream string) {
	err := c.rdb.XGroupCreateMkStream(ctx, stream, c.group, "$").Err()
	if err != nil {
		// Ignore busy group errors (meaning group already exists)
		if !isBusyGroupError(err) {
			slog.Warn("XGROUP CREATE warning", "stream", stream, "error", err)
		}
	}
}

func isBusyGroupError(err error) bool {
	return len(err.Error()) >= 11 && err.Error()[:11] == "BUSYGROUP "
}

func (c *Consumer) loop(ctx context.Context, stream string, handler func(ctx context.Context, data map[string]string) error) {
	slog.Info("Starting event consumer loop", "stream", stream, "group", c.group, "consumer", c.name)

	for {
		select {
		case <-ctx.Done():
			slog.Info("Stopping consumer loop due to cancellation context", "stream", stream)
			return
		default:
			// Read messages (blocking read)
			streams, err := c.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    c.group,
				Consumer: c.name,
				Streams:  []string{stream, ">"},
				Count:    1,
				Block:    0, // block indefinitely until message arrives
			}).Result()

			if err != nil {
				if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
					return
				}
				slog.Error("XREADGROUP error, backoff 2 seconds", "stream", stream, "error", err)
				time.Sleep(2 * time.Second)
				continue
			}

			for _, s := range streams {
				for _, msg := range s.Messages {
					msgData := make(map[string]string)
					for k, v := range msg.Values {
						if strVal, ok := v.(string); ok {
							msgData[k] = strVal
						}
					}

					// Process message with handler
					if err := handler(ctx, msgData); err != nil {
						slog.Error("Handler error, retrying", "stream", stream, "msgID", msg.ID, "error", err)
						continue
					}

					// Acknowledge event completion
					c.rdb.XAck(ctx, stream, c.group, msg.ID)
				}
			}
		}
	}
}

func (c *Consumer) handleTranscriptionCompleted(ctx context.Context, data map[string]string) error {
	meetingID := data["meetingId"]
	transcriptID := data["transcriptId"]

	if meetingID == "" || transcriptID == "" {
		slog.Warn("Invalid transcription.completed payload: missing fields", "data", data)
		return nil
	}

	slog.Info("Received transcription.completed event", "meetingId", meetingID, "transcriptId", transcriptID)

	dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		UPDATE meetings 
		SET transcript_id = $1, bot_status = 'processing', updated_at = NOW() 
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := c.dbPool.Exec(dbCtx, query, transcriptID, meetingID)
	return err
}

func (c *Consumer) handleIntelligenceCompleted(ctx context.Context, data map[string]string) error {
	meetingID := data["meetingId"]

	if meetingID == "" {
		slog.Warn("Invalid intelligence.completed payload: missing meetingId", "data", data)
		return nil
	}

	slog.Info("Received intelligence.completed event", "meetingId", meetingID)

	dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		UPDATE meetings 
		SET bot_status = 'completed', updated_at = NOW() 
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := c.dbPool.Exec(dbCtx, query, meetingID)
	return err
}
