package ws

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/lastminutes/gateway/internal/events"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for the workspace setup (production will rely on gateway level CORS validation)
		return true
	},
}

// Client represents a single connected WebSocket client
type Client struct {
	hub       *Hub
	meetingID string
	conn      *websocket.Conn
	send      chan []byte
}

// Hub maintains active client connections per meeting room and fans out messages
type Hub struct {
	redisClient *redis.Client
	rooms       map[string]map[*Client]bool
	roomsMutex  sync.RWMutex
	register    chan *Client
	unregister  chan *Client
}

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{
		redisClient: rdb,
		rooms:       make(map[string]map[*Client]bool),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
	}
}

// ServeHTTP upgrades the HTTP request to WebSocket and joins the meeting room
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "id")
	if meetingID == "" {
		http.Error(w, "Missing meeting id parameter", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WebSocket upgrade failed", "error", err)
		return
	}

	client := &Client{
		hub:       h,
		meetingID: meetingID,
		conn:      conn,
		send:      make(chan []byte, 256),
	}

	h.register <- client

	// Start reading and writing loops for the client
	go client.writePump()
	go client.readPump()
}

// Run handles client registration, unregistration, and runs the Redis Stream listener
func (h *Hub) Run(ctx context.Context) {
	// Start the background Redis Stream listener
	go h.listenRedisSegments(ctx)

	for {
		select {
		case client := <-h.register:
			h.roomsMutex.Lock()
			if h.rooms[client.meetingID] == nil {
				h.rooms[client.meetingID] = make(map[*Client]bool)
				slog.Info("WebSocket Room created", "meetingId", client.meetingID)
			}
			h.rooms[client.meetingID][client] = true
			h.roomsMutex.Unlock()
			slog.Info("WebSocket Client registered to room", "meetingId", client.meetingID)

		case client := <-h.unregister:
			h.roomsMutex.Lock()
			if clients, ok := h.rooms[client.meetingID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.send)
					slog.Info("WebSocket Client unregistered from room", "meetingId", client.meetingID)
					if len(clients) == 0 {
						delete(h.rooms, client.meetingID)
						slog.Info("WebSocket Room destroyed (empty)", "meetingId", client.meetingID)
					}
				}
			}
			h.roomsMutex.Unlock()
		}
	}
}

// listenRedisSegments polls stream:transcription:segments and broadcasts incoming transcript events to the correct rooms
func (h *Hub) listenRedisSegments(ctx context.Context) {
	stream := events.StreamTranscriptionSegments
	group := "gateway-ws-group"
	host := "gateway-ws-instance"

	// Ensure group exists
	err := h.redisClient.XGroupCreateMkStream(ctx, stream, group, "$").Err()
	if err != nil && ( /*!redis.IsRedisError(err) ||*/ len(err.Error()) < 11 || err.Error()[:11] != "BUSYGROUP ") {
		slog.Warn("WebSocket segment group warning", "error", err)
	}

	slog.Info("WebSocket segment subscription started", "stream", stream)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			// Read segments block
			streams, err := h.redisClient.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    group,
				Consumer: host,
				Streams:  []string{stream, ">"},
				Count:    10,
				Block:    0,
			}).Result()
			if err != nil {
				if errors.Is(err, context.Canceled) {
					return
				}
				slog.Error("WS XREADGROUP error, backoff 2 seconds", "error", err)
				time.Sleep(2 * time.Second)
				continue
			}

			for _, s := range streams {
				for _, msg := range s.Messages {
					meetingID, _ := msg.Values["meetingId"].(string)
					text, _ := msg.Values["text"].(string)
					speaker, _ := msg.Values["speaker"].(string)
					lang, _ := msg.Values["language"].(string)

					var start, end float64
					if startStr, ok := msg.Values["start"].(string); ok {
						_, _ = fmt.Sscanf(startStr, "%f", &start)
					}
					if endStr, ok := msg.Values["end"].(string); ok {
						_, _ = fmt.Sscanf(endStr, "%f", &end)
					}

					if meetingID == "" {
						h.redisClient.XAck(ctx, stream, group, msg.ID)
						continue
					}

					// Build segment response JSON
					payload := map[string]interface{}{
						"meetingId": meetingID,
						"text":      text,
						"speaker":   speaker,
						"start":     start,
						"end":       end,
						"language":  lang,
					}

					jsonBytes, err := json.Marshal(payload)
					if err == nil {
						h.broadcastToRoom(meetingID, jsonBytes)
					}

					// Acknowledge stream message
					h.redisClient.XAck(ctx, stream, group, msg.ID)
				}
			}
		}
	}
}

func (h *Hub) broadcastToRoom(meetingID string, message []byte) {
	h.roomsMutex.RLock()
	clients, ok := h.rooms[meetingID]
	if !ok || len(clients) == 0 {
		h.roomsMutex.RUnlock()
		return
	}

	for client := range clients {
		select {
		case client.send <- message:
		default:
			// Unregister client if send buffer is blocked
			go func(c *Client) {
				h.unregister <- c
				c.conn.Close()
			}(client)
		}
	}
	h.roomsMutex.RUnlock()
}

// readPump receives messages from the WebSocket client connection and forwards to hub (optional)
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// writePump pushes messages from the hub send channel to the active connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Add queued chat messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte("\n"))
				_, _ = w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
