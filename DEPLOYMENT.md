# Deployment Guide — Last Minutes MACH

This guide outlines how to deploy the microservices stack to Railway.

## 1. Prerequisites
- [Railway CLI](https://docs.railway.app/guides/cli) installed and logged in.
- Environment variables from `.env.example` ready.

## 2. Infrastructure Setup
1. **Create a New Project:** `railway init`
2. **Add Postgres:** Add the Postgres plugin via Railway dashboard. Ensure `pgvector` is available (standard on Railway's Postgres 16).
3. **Add Redis:** Add the Redis plugin.

## 3. Deploying Services

### Go Gateway
```bash
cd services/gateway
railway link
railway up
```
*   **Env Vars:** Add `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID`, `DEEPSEEK_API_KEY`.
*   **Automatic Migrations:** The `releaseCommand` in `railway.toml` will automatically run `/migrate` before every deployment.

### Rust Real-time Hub
```bash
cd services/realtime
railway link
railway up
```
*   **Env Vars:** Add `REDIS_URL`, `BETTER_AUTH_SECRET`, `PORT=8081`.

### Next.js Frontend
```bash
cd apps/web
railway link
railway up
```
*   **Env Vars:** Add `NEXT_PUBLIC_API_URL` (URL of Go Gateway) and `NEXT_PUBLIC_WS_URL` (URL of Rust service).

## 4. Promotion Flow
- **Dev:** Default branch deployments.
- **Production:** Use Railway's "Environment" feature to clone the project, update production secrets (RunPod keys, Paystack Live), and point your custom domain (lastminutes.ng) to the Next.js service.

## 5. Monitoring
- Use Railway's **Log Explorer** for Go's structured JSON logs.
- Use **Metrics** to monitor the Rust service's memory usage under load.
