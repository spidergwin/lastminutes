# Last Minutes MACH Architecture

This directory contains the production-grade microservices version of the Last Minutes platform.

## Services

- `apps/web`: Next.js frontend (Headless UI + Auth Core)
- `services/gateway`: Go service handling business logic, metadata, and security.
- `services/realtime`: Rust service handling microlatency WebSocket streaming.
- `services/worker`: Python service for ML processing, ASR, and Intelligence.

## Getting Started

1. Copy `.env.example` to `.env`.
2. Run `docker-compose up -d` in the `infra/` folder.
3. Run migrations: `cd services/gateway && go run cmd/migrate/main.go`
