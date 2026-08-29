import {
  defineRailway,
  image,
  postgres,
  preserve,
  project,
  redis,
  service,
  volume,
} from "railway/iac";

const varWithDescription = (value: string, description: string) => ({
  value,
  description,
});

export default defineRailway((ctx) => {
  const db = postgres("postgres");
  const cache = redis("redis");
  const storage = volume("outline-data");

  const outline = service("outline", {
    source: image("outlinewiki/outline:latest"),
    // Use /_health — Outline's dedicated endpoint (returns 200 "OK").
    // "/" fails on Railway because FORCE_HTTPS redirects HTTP health probes (non-200).
    healthcheck: "/_health",
    healthcheckTimeout: 600,
    volumeMounts: {
      "/var/lib/outline/data": storage,
    },
    env: {
      NODE_ENV: varWithDescription(
        "production",
        "Node.js runtime environment. Use production for deployed instances.",
      ),
      NODE_OPTIONS: varWithDescription(
        "--no-experimental-webstorage",
        "Node.js runtime flags. Suppresses localStorage warnings on newer Node versions.",
      ),
      DATABASE_URL: varWithDescription(
        "${{postgres.DATABASE_URL}}",
        "PostgreSQL connection URL. References the managed postgres service.",
      ),
      REDIS_URL: varWithDescription(
        "${{redis.REDIS_URL}}",
        "Redis connection URL. References the managed redis service.",
      ),
      SECRET_KEY: varWithDescription(
        ctx.randomString("secret-key", 32),
        "Secret key for encrypting sessions and cookies. Auto-generated; do not change after first deploy.",
      ),
      UTILS_SECRET: varWithDescription(
        ctx.randomString("utils-secret", 32),
        "Secret used for utility operations and background tasks. Auto-generated; do not change after first deploy.",
      ),
      URL: varWithDescription(
        "https://${{RAILWAY_PUBLIC_DOMAIN}}",
        "Public URL of your Outline instance. Uses the Railway-generated domain.",
      ),
      FORCE_HTTPS: varWithDescription(
        "true",
        "Redirect HTTP requests to HTTPS. Should remain enabled in production.",
      ),
      FILE_STORAGE: varWithDescription(
        "local",
        "File storage backend. Use local storage with the attached volume.",
      ),
      FILE_STORAGE_LOCAL_ROOT_DIR: varWithDescription(
        "/var/lib/outline/data",
        "Directory path for locally stored uploads and attachments.",
      ),
      DEFAULT_LANGUAGE: varWithDescription(
        "en_US",
        "Default language for the Outline user interface.",
      ),
      PORT: {
        description:
          "HTTP port for the Outline web server. Set automatically by Railway.",
      },
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      SMTP_SERVICE: preserve(),
      SMTP_USERNAME: preserve(),
      SMTP_PASSWORD: preserve(),
      SMTP_FROM_EMAIL: preserve(),
      OIDC_CLIENT_ID: preserve(),
      OIDC_CLIENT_SECRET: preserve(),
      OIDC_AUTH_URI: preserve(),
      OIDC_TOKEN_URI: preserve(),
      OIDC_USERINFO_URI: preserve(),
      SLACK_CLIENT_ID: preserve(),
      SLACK_CLIENT_SECRET: preserve(),
    },
  });

  return project("outline", {
    resources: [db, cache, outline, storage],
  });
});
