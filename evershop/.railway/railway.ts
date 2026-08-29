import {
  defineRailway,
  empty,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac";

const varWithDescription = (value: string, description: string) => ({
  value,
  description,
});

export default defineRailway((ctx) => {
  const database = postgres("database");
  const media = volume("evershop-media");

  const app = service("app", {
    source: empty(),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
    },
    healthcheck: "/health",
    healthcheckTimeout: 600,
    volumeMounts: {
      "/app/media": media,
    },
    env: {
      NODE_ENV: varWithDescription(
        "production",
        "Node.js runtime environment.",
      ),
      PORT: varWithDescription(
        "${{PORT}}",
        "HTTP listen port. Uses Railway-assigned PORT for external routing.",
      ),
      DB_HOST: varWithDescription(
        "${{database.PGHOST}}",
        "PostgreSQL host on Railway's private network.",
      ),
      DB_PORT: varWithDescription(
        "${{database.PGPORT}}",
        "PostgreSQL port.",
      ),
      DB_USER: varWithDescription(
        "${{database.PGUSER}}",
        "PostgreSQL username. References the database service.",
      ),
      DB_PASSWORD: varWithDescription(
        "${{database.PGPASSWORD}}",
        "PostgreSQL password. References the database service.",
      ),
      DB_NAME: varWithDescription(
        "${{database.PGDATABASE}}",
        "PostgreSQL database name. References the database service.",
      ),
      DB_SSLMODE: varWithDescription(
        "disable",
        "PostgreSQL SSL mode for private-network connections.",
      ),
      ADMIN_EMAIL: varWithDescription(
        "admin@example.com",
        "Initial admin email for the /admin panel.",
      ),
      ADMIN_PASSWORD: varWithDescription(
        ctx.randomString("admin-password", 32),
        "Initial admin password. Save this value — required to log in at /admin.",
      ),
      ADMIN_NAME: varWithDescription(
        "Admin",
        "Initial admin display name.",
      ),
      SEED_DEMO_DATA: varWithDescription(
        "true",
        "Seed demo products, categories, and widgets on first deploy.",
      ),
      SHOP_HOME_URL: preserve(),
      SENDGRID_API_KEY: preserve(),
    },
  });

  return project("evershop", {
    resources: [database, app, media],
  });
});
