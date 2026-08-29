# Deploy and Host Outline on Railway

Outline is a fast, collaborative knowledge base for teams. Built with React and Node.js, it offers real-time editing, Markdown support, full-text search, and a clean interface for building and sharing team documentation.

## About Hosting Outline

Hosting Outline on Railway provisions the full stack with minimal configuration. This template includes a managed PostgreSQL database for documents, collections, and user data; a managed Redis instance for caching, sessions, and real-time collaboration; and a persistent volume for local file storage. Outline runs as a single container from the official `outlinewiki/outline` image, with `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `UTILS_SECRET`, and `URL` wired automatically. Database migrations run on startup, and a `/_health` healthcheck (with a 600-second timeout) waits for Postgres and Redis before marking the deployment live. Generate a Railway domain, set Google OAuth credentials for sign-in, and optionally configure SMTP for invitations and notifications.

## Common Use Cases

- **Team Knowledge Base** — Centralize internal docs, onboarding guides, runbooks, and processes with real-time collaborative editing and full-text search.
- **Project Documentation** — Organize docs by collection, nest pages in a hierarchy, and keep project context and decisions in one place.
- **Company Wiki** — Run a living wiki with inline comments, subscriptions, and notifications when content is updated or you are mentioned.

## Dependencies for Outline Hosting

- **PostgreSQL Database** — Included in this template, connected over Railway's private network
- **Redis** — Included in this template, connected over Railway's private network
- **Persistent Volume** — Included for local file uploads and attachments at `/var/lib/outline/data`
- **Authentication Provider** — At least one required (Google OAuth included by default; OIDC and Slack optional)
- **SMTP Server** — Optional but recommended for invitations, notifications, and magic-link sign-in (bring your own, e.g. Resend, Mailgun, Postmark)

### Deployment Dependencies

- [Outline Documentation](https://docs.getoutline.com/s/hosting)
- [Outline Environment Variable Reference](https://docs.getoutline.com/s/hosting/doc/environment-variables-Ho6baT56HZ)
- [Google OAuth Setup](https://docs.getoutline.com/s/hosting/doc/google-hOuvtCmTqQ)
- [SMTP Configuration](https://docs.getoutline.com/s/hosting/doc/smtp-cqCJyZGMIB)
- [OpenID Connect (OIDC) Setup](https://docs.getoutline.com/s/hosting/doc/oidc-8CPBm6uC0I)
- [Slack Authentication](https://docs.getoutline.com/s/hosting/doc/slack-sgMujR8J9J)
- [Outline File Storage](https://docs.getoutline.com/s/hosting/doc/file-storage-N4M0T6Yh7s)

### Implementation Details

**Private network:** PostgreSQL and Redis communicate with Outline over Railway's private network. Neither database is exposed publicly by default.

**Secret keys:** `SECRET_KEY` and `UTILS_SECRET` are auto-generated on deploy. They must be unique 32-byte values and should not be changed after the first successful deployment.

**Public URL:** Set `URL` to `https://${{RAILWAY_PUBLIC_DOMAIN}}` (or your custom domain). Generate a Railway domain on the Outline service before first use.

**File storage:** This template uses local storage on a Railway volume (`FILE_STORAGE=local`). Uploads persist at `/var/lib/outline/data`. For S3-compatible storage instead, swap `FILE_STORAGE` and the related `AWS_*` variables per the Outline file storage docs.

**Healthcheck:** Use `/_health` (not `/`). Outline's `FORCE_HTTPS` setting redirects HTTP requests on `/`, which causes Railway healthchecks to fail.

## Why Deploy Outline on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Outline on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
