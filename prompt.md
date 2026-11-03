# CONTEXT: Fireflies.ai Clone - Specialized Architecture

## Project Overview

Building a meeting transcription platform focused on Nigerian languages. **Core AI is handled by African-Whisper** (<https://github.com/KevKibe/African-Whisper>), deployed on RunPod.

## ✅ Current Working Setup

- Next.js app with Better-Auth (JWT tokens working)
- PostgreSQL and Redis running via Docker Compose
- Go gateway service running but returning 401s
- African-Whisper identified as the AI engine (not a local Python worker)

## ❌ What's NOT Working / Needs Implementation

### Priority 1: Fix Go Gateway JWT Validation

**File:** `services/gateway/internal/middleware/auth.go`

The gateway rejects valid JWTs from Better-Auth. Need to implement proper JWT verification using the JWKS endpoint from Next.js (`http://localhost:3000/api/auth/jwks`).

**Expected flow:**

1. Client sends JWT in `Authorization: Bearer <token>`
2. Gateway fetches JWKS from Next.js (cache for 24 hours)
3. Gateway validates JWT signature using the public key from JWKS
4. Gateway extracts user claims and forwards to downstream services

### Priority 2: Connect Gateway to African-Whisper on RunPod

**Files:** `services/gateway/internal/handlers/transcribe.go`

Gateway needs to forward transcription requests to African-Whisper API.

**API contract expected:**

- Endpoint: `https://your-runpod-endpoint/v1/transcribe` (to be defined)
- Method: POST
- Headers: `Authorization: Bearer <runpod-api-key>`
- Body: multipart/form-data with audio file + metadata
- Response: JSON with transcript, speakers, timestamps

**Need help defining this contract and implementing the proxy.**

### Priority 3: Architecture Refactoring

**Current confusion:** Mixing Python worker logic with Go/Rust backend.

**Clarify the roles:**

- **Next.js** → Web app, auth, dashboard
- **Go Gateway** → API gateway, auth, routing, WebSocket for live captions
- **Rust Service** → (Optional) real-time audio streaming/WebSocket proxy
- **African-Whisper (RunPod)** → All AI: transcription, diarization, Nigerian language models

**Remove:** Local Python worker code (not needed)

### Priority 4: Missing Features

1. **WebSocket endpoint in Go** for real-time audio streaming
2. **Meeting bot logic** (to join Google Meet/Zoom) - maybe separate service?
3. **Nigerian language routing** - Should be configured in African-Whisper or a lightweight Go router?
4. **Chrome extension** - Captures audio → streams to Go WebSocket → forwards to African-Whisper
5. **Mobile app** - Same flow as extension

## What I Need From You (AI)

### For each issue, provide

1. **Exact code to fix the Go gateway JWT validation**
2. **How to define and call African-Whisper API from Go** (including retry, timeout, error handling)
3. **Updated docker-compose.yml** (remove Python worker, add Rust service if needed)
4. **WebSocket implementation in Go** for real-time audio streaming
5. **Sequence diagram/data flow** showing how components interact

### Files to focus on (modify/create)

services/gateway/
├── internal/
│ ├── middleware/
│ │ └── jwt.go # Fix JWT validation using JWKS
│ ├── handlers/
│ │ ├── transcribe.go # Proxy to African-Whisper
│ │ └── websocket.go # New: real-time streaming
│ └── clients/
│ └── african_whisper.go # New: API client
├── cmd/gateway/main.go
└── go.mod

services/rust/ # Optional: real-time proxy
├── Cargo.toml
└── src/main.rs

docker-compose.yml # Remove Python worker, add Rust if needed
text

## Current Environment

````bash
# Working
Next.js: http://localhost:3000 (auth OK)
PostgreSQL: localhost:5433 / postgres:5432
Redis: localhost:6379 / redis:6379
Go Gateway: http://localhost:8080 (returns 401)

# To be set up
African-Whisper: on RunPod (need endpoint URL)
Chrome Extension: not started
Mobile App: React Native (existing code)

Questions to Answer in Response

    How should Go fetch and cache the JWKS from Next.js? (Example code)

    What's the optimal API contract for African-Whisper? (Request/response format)

    Do we need Rust for WebSocket, or can Go handle 1000+ concurrent connections?

    How to handle long-running transcriptions? (Webhook vs polling)

    Where should Nigerian language routing live? (Go vs African-Whisper)

Test Commands After Fixes
bash

# 1. Get JWT from Next.js
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# 2. Test Go gateway with JWT
curl -X GET http://localhost:8080/v1/usage \
  -H "Authorization: Bearer <jwt>"

# 3. Test transcription (mock African-Whisper first)
curl -X POST http://localhost:8080/v1/transcribe \
  -H "Authorization: Bearer <jwt>" \
  -F "audio=@test.wav"

Success Definition

    ✅ Go gateway returns 200 with JWT (not 401)

    ✅ Gateway can call African-Whisper (or mock)

    ✅ Real-time WebSocket streams audio

    ✅ No Python worker code in repo

text


---

## Quick Fix Before Using Prompt

You said the token is working — but Go returns 401. That means **Go can't validate the JWT**.

**Temporary workaround** while you implement JWKS validation:

```go
// In your Go gateway, add this to bypass validation for testing
// services/gateway/internal/middleware/auth.go

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // TEMP: Hardcode a test user for development
        ctx := context.WithValue(r.Context(), "userID", "test-user-id")
        ctx = context.WithValue(ctx, "email", "test@example.com")
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

This will let you test the rest of the gateway while you implement proper JWT validation.

Next step: Use the prompt above with your AI tool, focusing first on Priority 1: fixing JWT validation using the JWKS endpoint. After that, implement the African-Whisper client.
````
