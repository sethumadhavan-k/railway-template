# Deploy and Host Databasus on Railway

[Databasus](https://databasus.com/) is a free, open-source, self-hosted backup tool for PostgreSQL (primary), MySQL, MariaDB, and MongoDB — with scheduling, multi-storage destinations, notifications, restore verification, and Point-in-Time Recovery focused workflows.

**Deploy:** [railway.com/deploy/databasus-demo](https://railway.com/deploy/databasus-demo) · **Demo:** [databasus-production-a063.up.railway.app](https://databasus-production-a063.up.railway.app)

## About Hosting Databasus

This template builds the [Dockerfile](Dockerfile) in this folder (wraps `ghcr.io/databasus/databasus:v3.63.0`) on port 4005 with anonymous telemetry disabled. On first boot it creates the admin from `DATABASUS_ADMIN_EMAIL` / `DATABASUS_ADMIN_PASSWORD` and closes external registration. You can re-open sign-up later in **Databasus settings → Allow sign up**.

Metadata and the encryption key live in an embedded PostgreSQL 17 cluster on a volume at `/databasus-data`. A Railway Bucket (`databasus-backups`) supplies S3 credentials as `S3_*` variables for you to register as a storage destination in the UI.

## Common Use Cases

- Back up Railway Postgres (and other DBs) over the private network on a schedule
- Keep encrypted off-site copies in a Railway Bucket (or any S3-compatible store)
- Restore verification, health checks, and Slack/Discord/Telegram backup alerts from one dashboard

## Dependencies for Databasus Hosting

- Volume at `/databasus-data` — embedded Postgres, `secret.key`, optional local backups
- Railway Bucket `databasus-backups` — S3-compatible destination for backup archives
- Public domain — HTTPS UI/API (generate a Railway domain)
- `DATABASUS_ADMIN_EMAIL` and `DATABASUS_ADMIN_PASSWORD` — first admin (required at deploy)

### Deployment Dependencies

- [Databasus](https://databasus.com/) · [GitHub](https://github.com/databasus/databasus) · Apache-2.0
- Image base: `ghcr.io/databasus/databasus:v3.63.0` (built via this repo’s Dockerfile)
- [Installation docs](https://databasus.com/installation) · [Advanced config](https://databasus.com/advanced-config)
- [Railway Buckets](https://docs.railway.com/storage-buckets) · [Private networking](https://docs.railway.com/guides/private-networking)

### Implementation Details

| Service / resource | Role |
| --- | --- |
| databasus | Web UI and API on 4005; scheduler; embedded Postgres 17 on `/databasus-data` |
| databasus-backups | Railway Bucket; credentials exposed as `S3_*` on the Databasus service |

**First login**

1. At deploy, set **admin email** and **admin password**. After the service is up, open the public URL and **sign in** with those credentials (external registration is closed).
2. Optionally open **Databasus settings → Allow sign up** if you want others to register.
3. Create a workspace, then under Storages add **S3**. Paste `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. Enable **virtual-hosted style** for current Railway Buckets. Test connection.
4. Add a database (private host e.g. `postgres.railway.internal`, port 5432; SSL can stay off on the private network). Prefer accepting Databasus’s read-only user when offered.
5. Save the encryption key: `railway ssh --service databasus -- cat /databasus-data/secret.key`. Encrypted backups cannot be restored without it if the volume is lost.

Local volume storage works without the bucket, but watch volume size on Hobby. Prefer the bucket for off-site copies.

Optional: SMTP (`SMTP_HOST`, `DATABASUS_URL`, etc.) for invites and password reset — see [advanced config](https://databasus.com/advanced-config).

## Why Deploy Databasus on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Databasus on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
