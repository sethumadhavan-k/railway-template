# Deploy and Host Dify on Railway

[Dify](https://dify.ai) is an open-source LLM app development platform with visual workflows, RAG pipelines, agents, and API management. This template deploys the full Dify 1.17 production stack on Railway.

## About Hosting Dify

Hosting Dify on Railway maps the official [Dify Docker Compose](https://docs.dify.ai/en/self-host/deploy/quick-start/docker-compose) stack to individual Railway services. Only **nginx** is public; everything else communicates over Railway's private network.

The stack includes:

- **nginx** — reverse proxy (custom image) for `/`, `/console/api`, `/api`, `/v1`, `/files`, `/socket.io`, `/e/` (plugin webhooks)
- **postgres** — PostgreSQL 15 for Dify and plugin metadata
- **redis** — managed Redis for cache and Celery
- **weaviate** — vector database for RAG knowledge bases
- **minio** — S3-compatible object storage (shared files across api/worker)
- **api** / **api-websocket** / **worker** / **worker-beat** — Dify backend (`langgenius/dify-api:1.17.0`)
- **web** — Dify frontend (`langgenius/dify-web:1.17.0`)
- **plugin-daemon** — Dify plugin runtime
- **agent-backend** / **local-sandbox** — Dify Agent shell workspaces
- **sandbox** / **ssrf-proxy** / **agent-ssrf-proxy** — secure code execution with SSRF protection

After deploy:

1. Generate a public domain on the **nginx** service (Settings → Networking).
2. Redeploy so `CONSOLE_API_URL`, `APP_API_URL`, and related URL variables resolve.
3. Open `https://<your-domain>/install` to create the admin account.
4. Add LLM provider API keys in **Settings → Model Providers**.

## Common Use Cases

- Self-hosted AI app builder with full data ownership
- RAG knowledge bases and agent workflows without SaaS lock-in
- Staging or demo Dify instance for team evaluation
- Plugin marketplace integration with outbound SSRF controls

### Publishing as a Railway template

Railway cannot generate a template from services deployed with `railway up` (empty source). The custom **nginx**, **ssrf-proxy**, and **agent-ssrf-proxy** services must be connected to a **GitHub repo** before running `railway templates create`:

1. Push this monorepo to GitHub (default IaC repo: `sethumadhavan-k/railway-template`). Override with `RAILWAY_TEMPLATE_REPO=owner/repo` when applying IaC.
2. Connect the repo to your Railway project (GitHub App access required).
3. From `dify/`, run `npm run plan` then `npm run apply:yes` to wire GitHub sources (`rootDirectory: dify`, Dockerfile paths under `dify/`).
4. Redeploy nginx, ssrf-proxy, and agent-ssrf-proxy from the connected repo.
5. Create the template: `railway templates create --project <project-id> --environment production`

## Dependencies for Dify Hosting

- **Public domain on nginx** — Required for `CONSOLE_API_URL`, file URLs, and WebSocket endpoints
- **GitHub repo with this template** — nginx and SSRF proxy images are built from this repo (set service root directory to `dify` in a monorepo)
- **External LLM API keys** — Railway is CPU-only; inference uses OpenAI, Anthropic, or other providers you configure in Dify
- **Optional INIT_PASSWORD** — Protect the `/install` setup page on the **api** service

### Deployment Dependencies

- [Dify repository](https://github.com/langgenius/dify)
- [Dify self-host deploy overview](https://docs.dify.ai/en/self-host/deploy/overview)
- [Environment variables reference](https://docs.dify.ai/en/self-host/deploy/configuration/environments)
- [Railway Dify guide](https://docs.railway.com/guides/dify)

### Environment Variables (highlights)

| Variable | Service | Description |
|----------|---------|-------------|
| `SECRET_KEY` | api, worker | Auto-generated app secret — do not rotate after first deploy |
| `CONSOLE_API_URL` / `APP_API_URL` | api, worker, web | `https://${{nginx.RAILWAY_PUBLIC_DOMAIN}}` |
| `NEXT_PUBLIC_SOCKET_URL` | web | `wss://${{nginx.RAILWAY_PUBLIC_DOMAIN}}` |
| `S3_*` | api, worker | Wired to MinIO over the private network |
| `WEAVIATE_*` | api, worker, weaviate | Vector store for knowledge bases |
| `PLUGIN_DAEMON_KEY` | api, plugin-daemon | Plugin authentication key |
| `SANDBOX_API_KEY` | api, sandbox | Code execution sandbox key |
| `OPENAI_API_KEY` | api | Optional; configure providers in Dify UI instead |

### Volumes

| Service | Mount path | Purpose |
|---------|------------|---------|
| postgres | `/var/lib/postgresql/data` | Database files |
| weaviate | `/var/lib/weaviate` | Vector index data |
| minio | `/data` | S3 object storage |
| plugin-daemon | `/app/storage` | Plugin packages and cache |
| sandbox | `/dependencies` | Sandbox Python dependencies (conf uses image defaults; Railway allows one volume per service) |
| local-sandbox | `/workspace` | Agent shell workspace (home dir is ephemeral) |

### Implementation Details

**Private network:** Backends are not exposed publicly. nginx proxies using `${{service.RAILWAY_PRIVATE_DOMAIN}}` and fixed container ports (API `5001`, Web `3000`, Plugin daemon `5002`).

**Shared storage:** Railway cannot share volumes across services. This template uses MinIO (S3-compatible) instead of local filesystem storage.

**Healthchecks:** nginx uses `/nginx-health` (local, does not wait on backends). **dify-api** and **api-websocket** use `/health` on port `5001` (set `PORT=5001` so Railway probes match `DIFY_PORT`). **sandbox** and **local-sandbox** set `PORT` to `8194` / `5004` for `/health` and `/healthz`.

**SSRF proxies:** Code sandbox and agent local sandbox egress route through dedicated Squid proxies, matching upstream Dify security architecture.

## Why Deploy Dify on Railway?

Railway hosts your full infrastructure stack on one platform — services, databases, volumes, and networking — so you can run a production-grade Dify instance without managing Docker Compose on a VM.

By deploying Dify on Railway, you get private service networking, persistent volumes, and one-click scaling while keeping full control of your data and LLM provider credentials.
