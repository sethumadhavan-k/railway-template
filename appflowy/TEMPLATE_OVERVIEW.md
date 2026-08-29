# Deploy and Host AppFlowy on Railway

AppFlowy is an open-source, AI-powered collaborative workspace (Notion alternative) with documents, databases, kanban boards, calendars, and realtime collaboration. This template deploys the full AppFlowy Cloud production stack on Railway.

## About Hosting AppFlowy

Hosting AppFlowy on Railway maps the official [AppFlowy-Cloud](https://github.com/AppFlowy-IO/AppFlowy-Cloud) Docker Compose stack to individual Railway services. Only **nginx** is public; everything else communicates over Railway's private network.

The stack includes:

- **nginx** — reverse proxy (custom image in this repo) for `/`, `/api`, `/ws`, `/gotrue`, `/console`, `/minio`, `/minio-api`
- **postgres** — `pgvector/pgvector:pg16` (pgvector required; not Railway managed Postgres)
- **redis** — managed Redis for cache and jobs
- **minio** — S3-compatible object storage for uploads and collab blobs
- **gotrue** — authentication (Supabase Auth fork)
- **appflowy-cloud** — core API and WebSocket server
- **appflowy-web** — browser UI
- **admin-frontend** — admin console at `/console`
- **appflowy-worker** — background import/jobs
- **appflowy-ai** — AI service (features need an OpenAI key)
- **appflowy-search** — search / keyword index

After deploy:

1. Generate a public domain on the **nginx** service (Settings → Networking).
2. Redeploy so `APPFLOWY_BASE_URL` and related URLs resolve.
3. Open `https://<your-domain>/` for AppFlowy Web.
4. Open `https://<your-domain>/console` and log in with `GOTRUE_ADMIN_EMAIL` / `GOTRUE_ADMIN_PASSWORD` from the **gotrue** Variables tab.

## Common Use Cases

- Self-hosted team wiki and project workspace with full data ownership
- Notion alternative without per-seat SaaS fees
- Staging / demo AppFlowy Cloud for desktop and web clients
- AI-assisted docs and search once an OpenAI (or Azure OpenAI) key is set

## Dependencies for AppFlowy Hosting

- **Public domain on nginx** — Required for `APPFLOWY_BASE_URL`, auth redirects, and WebSocket URLs
- **GitHub repo with this template** — nginx is built from `nginx/Dockerfile` (set service root directory to `appflowy` in a monorepo)
- **Optional SMTP** — For email confirmation; default is `GOTRUE_MAILER_AUTOCONFIRM=true`
- **Optional OpenAI API key** — Enables AI features on `appflowy-ai` / search

### Deployment Dependencies

- [AppFlowy Cloud repository](https://github.com/AppFlowy-IO/AppFlowy-Cloud)
- [Production deploy.env](https://github.com/AppFlowy-IO/AppFlowy-Cloud/blob/main/deploy.env)
- [Self-hosting guide](https://appflowy.com/docs/Step-by-step-Self-Hosting-Guide---From-Zero-to-Production)
- [AppFlowy Cloud deployment docs](https://docs.appflowy.io/docs/documentation/appflowy-cloud/deployment)

### Environment Variables (highlights)

| Variable | Service | Description |
|----------|---------|-------------|
| `GOTRUE_ADMIN_EMAIL` | gotrue | Admin console login email (default `admin@example.com`) |
| `GOTRUE_ADMIN_PASSWORD` | gotrue | Auto-generated admin password — save this |
| `GOTRUE_JWT_SECRET` | gotrue | Auto-generated JWT secret shared with Cloud/AI/Search |
| `APPFLOWY_BASE_URL` | cloud, web, … | `https://${{nginx.RAILWAY_PUBLIC_DOMAIN}}` |
| `APPFLOWY_S3_*` | cloud, worker, ai, search | Wired to MinIO over the private network |
| `AI_OPENAI_API_KEY` / `OPENAI_API_KEY` | cloud / ai | Optional; leave empty until you enable AI |
| `GOTRUE_SMTP_*` / `APPFLOWY_MAILER_SMTP_*` | gotrue / cloud | Optional SMTP for production email |

### Volumes

| Service | Mount path | Purpose |
|---------|------------|---------|
| postgres | `/var/lib/postgresql/data` | Database files |
| minio | `/data` | Object storage |
| appflowy-search | `/var/lib/appflowy/keyword_index` | Keyword search index |

### Implementation Details

**Private network:** Backends are not exposed publicly. nginx proxies using `${{service.RAILWAY_PRIVATE_DOMAIN}}` and fixed container ports (Cloud `8000`, GoTrue `9999`, Web `80`, Admin `3000`, MinIO `9000`/`9001`).

**pgvector:** Railway's standard Postgres image does not include pgvector. This template uses `pgvector/pgvector:pg16`. If migrations fail on vector types, run once: `CREATE EXTENSION IF NOT EXISTS vector;`

**Healthchecks:** nginx uses `/nginx-health` (local, does not wait on backends). Cloud uses `/api/health`. Timeouts are 600s for first boot.

**Auth defaults:** Signup is open with email autoconfirm so you can log in without SMTP. Tighten signup and configure SMTP for production.

**AI:** The AI and Search services are deployed with the full stack. Chat/embeddings stay inactive until you set an OpenAI (or Azure) API key.

## Why Deploy AppFlowy on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying AppFlowy on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
