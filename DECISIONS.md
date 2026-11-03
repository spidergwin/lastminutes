# ADR-001: Better-auth stays in Next.js

**Status:** Accepted
**Context:** Better Auth is tightly coupled to Next.js middleware and React ecosystem. Rewriting the entire auth logic in Go/Rust would delay the migration significantly.
**Decision:** Keep the Better Auth core in `apps/web`. Use the `jwt()` plugin to generate tokens that the Go Gateway and Rust services can validate using the shared `BETTER_AUTH_SECRET`.
**Consequences:** Auth remains easy to manage in Next.js, while other services remain truly headless and stateless.

# ADR-002: Shared Postgres instance

**Status:** Accepted
**Context:** 12-factor apps treat backing services as attached resources. 
**Decision:** All microservices connect to the same Postgres instance via a single `DATABASE_URL`.
**Consequences:** Avoids data synchronization issues between services while allowing them to scale independently.

# ADR-003: Redis Streams for Inter-Service Communication

**Status:** Accepted
**Context:** We need reliable, persistent messaging that supports consumer groups.
**Decision:** Use Redis Streams (XADD/XREADGROUP) for all async tasks (transcription, intelligence).
**Consequences:** Enables crash recovery (via `stream_checkpoints`) and horizontal scaling of workers.

# ADR-004: Rust for Real-time WebSocket Hub

**Status:** Accepted
**Context:** Real-time transcription requires microlatency and zero GC jitter.
**Decision:** Implement the WebSocket hub in Rust using `tokio` and `tungstenite`.
**Consequences:** Provides the performance required for a "live" feel while keeping the Go Gateway focused on business logic.

# ADR-005: Stateless Python Worker for ML

**Status:** Accepted
**Context:** Python has the best library support for ML models (Whisper, etc.).
**Decision:** The Worker is a pure Redis consumer that processes media and writes to the shared DB.
**Consequences:** Easy to package ML dependencies (FFmpeg, CUDA) in a dedicated container.
