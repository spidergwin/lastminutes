# Multi-stage Dockerfile for Python Background Worker
# Supports dev hot-reloading target and secure production release targets

# --- Development stage ---
FROM python:3.11-slim AS dev

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["watchfiles", "python -m worker.main", "worker/"]


# --- Production builder stage ---
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# --- Production release stage ---
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /install /usr/local
COPY worker/ ./worker/

RUN useradd -u 1000 -m worker && chown -R worker:worker /app
USER worker

CMD ["python", "-m", "worker.main"]
