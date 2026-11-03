# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o gateway ./cmd/gateway
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o migrate ./cmd/migrate

# Final stage
FROM gcr.io/distroless/static-debian12

WORKDIR /

COPY --from=builder /build/gateway /gateway
COPY --from=builder /build/migrate /migrate
COPY --from=builder /build/internal/db/migrations /migrations

# Use nonroot user for security
USER nonroot:nonroot

EXPOSE 8082

ENTRYPOINT ["/gateway"]
