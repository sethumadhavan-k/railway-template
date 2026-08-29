import {
  defineRailway,
  image,
  postgres,
  project,
  service,
} from "railway/iac";

const varWithDescription = (value: string, description: string) => ({
  value,
  description,
});

export default defineRailway((ctx) => {
  const db = postgres("postgres");

  const server = service("server", {
    source: image("galileoai/agent-control-server:latest"),
    healthcheck: "/health",
    healthcheckTimeout: 300,
    env: {
      AGENT_CONTROL_DB_URL: varWithDescription(
        "postgresql+psycopg://${{postgres.PGUSER}}:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{postgres.PGDATABASE}}",
        "PostgreSQL connection URL with psycopg driver. References the managed postgres service.",
      ),
      AGENT_CONTROL_HOST: varWithDescription("0.0.0.0", "Server bind address."),
      AGENT_CONTROL_PORT: varWithDescription(
        "${{PORT}}",
        "Server listen port. Uses Railway-assigned PORT for external routing.",
      ),
      AGENT_CONTROL_API_KEY_ENABLED: varWithDescription(
        "true",
        "Enable API key authentication. Should remain enabled in production.",
      ),
      AGENT_CONTROL_API_KEYS: varWithDescription(
        ctx.randomString("api-keys", 32),
        "Auto-generated API key for runtime and read access. Save this value for SDK and API clients.",
      ),
      AGENT_CONTROL_ADMIN_API_KEYS: varWithDescription(
        ctx.randomString("admin-api-keys", 32),
        "Auto-generated admin API key for control-plane mutations and UI login. Save this value.",
      ),
      AGENT_CONTROL_SESSION_SECRET: varWithDescription(
        ctx.randomString("session-secret", 64),
        "Secret for session encryption. Auto-generated; do not change after first deploy.",
      ),
      AGENT_CONTROL_CORS_ORIGINS: varWithDescription(
        "https://${{server.RAILWAY_PUBLIC_DOMAIN}}",
        "Allowed CORS origins for the bundled dashboard served from the server public domain.",
      ),
      GALILEO_API_KEY: varWithDescription(
        "",
        "Optional Galileo API key for the Luna-2 AI evaluator.",
      ),
    },
  });

  return project("agent-control", {
    resources: [db, server],
  });
});
