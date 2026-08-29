# Deploy and Host Agent Control Dev on Railway

Agent Control Dev is an open-source control plane for AI agent guardrails. It lets you define runtime policies, evaluate agent requests against controls, and manage agents from a built-in dashboard — without changing your application code on every policy update.

## About Hosting Agent Control Dev

Hosting Agent Control Dev on Railway provisions a two-service stack with minimal configuration. This template includes a managed PostgreSQL database and the official `galileoai/agent-control-server` Docker image, which serves both the REST API and the bundled web dashboard from a single service.

`AGENT_CONTROL_DB_URL`, API keys, session secrets, and CORS settings are wired automatically over Railway's private network. Database migrations run on server startup, and a `/health` healthcheck (300-second timeout) waits for Postgres before marking the deployment live. API key authentication is enabled by default in production.

After deploy, generate a public domain on the **server** service, open it in your browser, and log in with the auto-generated `AGENT_CONTROL_ADMIN_API_KEYS` value from the server variables. Use `AGENT_CONTROL_API_KEYS` for SDK and runtime API access.

## Common Use Cases

- **Runtime guardrails** — Block prompt injection, PII leakage, and unsafe tool calls in production AI agents
- **Centralized policy management** — Create and update controls via the dashboard or API without redeploying agent code
- **Agent observability** — Monitor evaluation activity, pass/block ratios, and control performance across agents

## Dependencies for Agent Control Dev Hosting

- **PostgreSQL Database** — Included in this template, connected over Railway's private network
- **Public domain on server** — Required for dashboard access and same-origin API authentication

### Deployment Dependencies

- [Agent Control Documentation](https://docs.agentcontrol.dev/)
- [Server configuration](https://docs.agentcontrol.dev/components/server)
- [Enable authentication](https://docs.agentcontrol.dev/how-to/enable-authentication)
- [GitHub repository](https://github.com/agentcontrol/agent-control)

### Implementation Details

**Single-service UI:** The server image includes the dashboard — no separate UI container is required. Access the app at `https://${{RAILWAY_PUBLIC_DOMAIN}}` on the server service.

**Private network:** PostgreSQL communicates with the server over Railway's private network and is not exposed publicly by default.

**API keys:** `AGENT_CONTROL_API_KEYS` and `AGENT_CONTROL_ADMIN_API_KEYS` are auto-generated on deploy. Save both values — the admin key is required for UI login and control-plane mutations.

**Healthcheck:** Use `/health` (not `/`). The server binds to Railway's assigned `PORT` for external routing.

**Optional evaluator:** Set `GALILEO_API_KEY` on the server service to enable the Luna-2 AI evaluator.

## Why Deploy Agent Control Dev on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Agent Control Dev on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
