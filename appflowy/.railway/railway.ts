import {
  defineRailway,
  empty,
  group,
  image,
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
  const pgData = volume("postgres-data");
  const minioData = volume("minio-data");
  const keywordIndex = volume("keyword-index");

  const cache = redis("redis");

  const postgresPassword = ctx.randomString("postgres-password", 32);
  const minioAccessKey = ctx.randomString("minio-access", 20);
  const minioSecretKey = ctx.randomString("minio-secret", 40);
  const jwtSecret = ctx.randomString("gotrue-jwt", 32);
  const adminPassword = ctx.randomString("gotrue-admin-password", 24);

  const dbUrl =
    "postgres://${{postgres.POSTGRES_USER}}:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{postgres.POSTGRES_DB}}";
  const baseUrl = "https://${{nginx.RAILWAY_PUBLIC_DOMAIN}}";
  const wsUrl = "wss://${{nginx.RAILWAY_PUBLIC_DOMAIN}}/ws/v2";

  const postgres = service("postgres", {
    source: image("pgvector/pgvector:pg16"),
    volumeMounts: {
      "/var/lib/postgresql/data": pgData,
    },
    env: {
      POSTGRES_USER: varWithDescription(
        "postgres",
        "PostgreSQL username for AppFlowy and GoTrue.",
      ),
      POSTGRES_PASSWORD: varWithDescription(
        postgresPassword,
        "PostgreSQL password. Auto-generated; do not change after first deploy.",
      ),
      POSTGRES_DB: varWithDescription(
        "postgres",
        "PostgreSQL database name.",
      ),
      PGDATA: varWithDescription(
        "/var/lib/postgresql/data/pgdata",
        "PostgreSQL data directory inside the volume.",
      ),
    },
  });

  const minio = service("minio", {
    source: image("minio/minio:latest"),
    start: 'server /data --console-address ":9001"',
    volumeMounts: {
      "/data": minioData,
    },
    env: {
      MINIO_ROOT_USER: varWithDescription(
        minioAccessKey,
        "MinIO root access key. Shared with AppFlowy S3 credentials.",
      ),
      MINIO_ROOT_PASSWORD: varWithDescription(
        minioSecretKey,
        "MinIO root secret key. Shared with AppFlowy S3 credentials.",
      ),
      MINIO_BROWSER_REDIRECT_URL: varWithDescription(
        `${baseUrl}/minio`,
        "MinIO console redirect URL via the nginx gateway.",
      ),
    },
  });

  const gotrue = service("gotrue", {
    source: image("appflowyinc/gotrue:latest"),
    healthcheck: "/health",
    healthcheckTimeout: 600,
    env: {
      GOTRUE_ADMIN_EMAIL: varWithDescription(
        "admin@example.com",
        "Initial GoTrue admin email. Log in at /console with this address.",
      ),
      GOTRUE_ADMIN_PASSWORD: varWithDescription(
        adminPassword,
        "Initial GoTrue admin password. Save this — required for /console login.",
      ),
      GOTRUE_DISABLE_SIGNUP: varWithDescription(
        "false",
        "When true, only invites can create accounts.",
      ),
      GOTRUE_SITE_URL: varWithDescription(
        "appflowy-flutter://",
        "Deep-link URL for the AppFlowy desktop/mobile client.",
      ),
      GOTRUE_URI_ALLOW_LIST: varWithDescription(
        "**",
        "Allowed redirect URI patterns for auth callbacks.",
      ),
      GOTRUE_JWT_SECRET: varWithDescription(
        jwtSecret,
        "JWT signing secret shared by GoTrue and AppFlowy Cloud. Do not change after first deploy.",
      ),
      GOTRUE_JWT_EXP: varWithDescription(
        "604800",
        "JWT expiration in seconds (default 7 days).",
      ),
      GOTRUE_JWT_ADMIN_GROUP_NAME: varWithDescription(
        "supabase_admin",
        "JWT admin group name required by AppFlowy GoTrue.",
      ),
      GOTRUE_DB_DRIVER: varWithDescription(
        "postgres",
        "GoTrue database driver.",
      ),
      API_EXTERNAL_URL: varWithDescription(
        `${baseUrl}/gotrue`,
        "Public GoTrue URL exposed through nginx.",
      ),
      DATABASE_URL: varWithDescription(
        `${dbUrl}?search_path=auth`,
        "GoTrue Postgres URL (auth schema).",
      ),
      PORT: varWithDescription(
        "9999",
        "GoTrue listen port on the private network.",
      ),
      GOTRUE_MAILER_AUTOCONFIRM: varWithDescription(
        "true",
        "Auto-confirm signups. Set false when SMTP is configured.",
      ),
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: varWithDescription(
        "/gotrue/verify",
        "Email confirmation path (proxied via nginx).",
      ),
      GOTRUE_MAILER_URLPATHS_INVITE: varWithDescription(
        "/gotrue/verify",
        "Invite verification path.",
      ),
      GOTRUE_MAILER_URLPATHS_RECOVERY: varWithDescription(
        "/gotrue/verify",
        "Password recovery path.",
      ),
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: varWithDescription(
        "/gotrue/verify",
        "Email change verification path.",
      ),
      GOTRUE_SMTP_HOST: preserve(),
      GOTRUE_SMTP_PORT: preserve(),
      GOTRUE_SMTP_USER: preserve(),
      GOTRUE_SMTP_PASS: preserve(),
      GOTRUE_SMTP_ADMIN_EMAIL: preserve(),
      GOTRUE_EXTERNAL_GOOGLE_ENABLED: varWithDescription(
        "false",
        "Enable Google OAuth.",
      ),
      GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: preserve(),
      GOTRUE_EXTERNAL_GOOGLE_SECRET: preserve(),
      GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: varWithDescription(
        `${baseUrl}/gotrue/callback`,
        "Google OAuth redirect URI.",
      ),
      GOTRUE_EXTERNAL_GITHUB_ENABLED: varWithDescription(
        "false",
        "Enable GitHub OAuth.",
      ),
      GOTRUE_EXTERNAL_GITHUB_CLIENT_ID: preserve(),
      GOTRUE_EXTERNAL_GITHUB_SECRET: preserve(),
      GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI: varWithDescription(
        `${baseUrl}/gotrue/callback`,
        "GitHub OAuth redirect URI.",
      ),
    },
  });

  const appflowyCloud = service("appflowy-cloud", {
    source: image("appflowyinc/appflowy_cloud:latest"),
    healthcheck: "/api/health",
    healthcheckTimeout: 600,
    env: {
      RUST_LOG: varWithDescription("info", "Log level for AppFlowy Cloud."),
      APPFLOWY_ENVIRONMENT: varWithDescription(
        "production",
        "AppFlowy runtime environment.",
      ),
      APPFLOWY_DATABASE_URL: varWithDescription(
        dbUrl,
        "Postgres connection URL for AppFlowy Cloud.",
      ),
      APPFLOWY_REDIS_URI: varWithDescription(
        "${{redis.REDIS_URL}}",
        "Redis connection URL.",
      ),
      APPFLOWY_GOTRUE_JWT_SECRET: varWithDescription(
        "${{gotrue.GOTRUE_JWT_SECRET}}",
        "Must match GoTrue JWT secret.",
      ),
      APPFLOWY_GOTRUE_BASE_URL: varWithDescription(
        "http://${{gotrue.RAILWAY_PRIVATE_DOMAIN}}:9999",
        "Internal GoTrue URL on the private network.",
      ),
      APPFLOWY_S3_CREATE_BUCKET: varWithDescription(
        "true",
        "Create the S3/MinIO bucket on startup if missing.",
      ),
      APPFLOWY_S3_USE_MINIO: varWithDescription(
        "true",
        "Use MinIO (S3-compatible) for file storage.",
      ),
      APPFLOWY_S3_MINIO_URL: varWithDescription(
        "http://${{minio.RAILWAY_PRIVATE_DOMAIN}}:9000",
        "Internal MinIO API URL.",
      ),
      APPFLOWY_S3_ACCESS_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_USER}}",
        "S3/MinIO access key.",
      ),
      APPFLOWY_S3_SECRET_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_PASSWORD}}",
        "S3/MinIO secret key.",
      ),
      APPFLOWY_S3_BUCKET: varWithDescription(
        "appflowy",
        "Object storage bucket name.",
      ),
      APPFLOWY_S3_PRESIGNED_URL_ENDPOINT: varWithDescription(
        `${baseUrl}/minio-api`,
        "Public MinIO API path for client presigned uploads.",
      ),
      APPFLOWY_ACCESS_CONTROL: varWithDescription(
        "true",
        "Enable permission-based access control.",
      ),
      APPFLOWY_DATABASE_MAX_CONNECTIONS: varWithDescription(
        "40",
        "Max Postgres connections for AppFlowy Cloud.",
      ),
      AI_SERVER_HOST: varWithDescription(
        "${{appflowy-ai.RAILWAY_PRIVATE_DOMAIN}}",
        "Internal AppFlowy AI hostname.",
      ),
      AI_SERVER_PORT: varWithDescription(
        "5001",
        "AppFlowy AI listen port.",
      ),
      AI_ENABLED: varWithDescription(
        "true",
        "Enable AI integration (requires AI_OPENAI_API_KEY for features).",
      ),
      AI_OPENAI_API_KEY: preserve(),
      APPFLOWY_WEB_URL: varWithDescription(
        baseUrl,
        "Public AppFlowy Web URL (nginx domain).",
      ),
      APPFLOWY_BASE_URL: varWithDescription(
        baseUrl,
        "Public base URL for AppFlowy Cloud.",
      ),
      APPFLOWY_SEARCH_SERVICE_URL: varWithDescription(
        "http://${{appflowy-search.RAILWAY_PRIVATE_DOMAIN}}:4002",
        "Internal search service URL.",
      ),
      APPFLOWY_MAILER_SMTP_HOST: preserve(),
      APPFLOWY_MAILER_SMTP_PORT: preserve(),
      APPFLOWY_MAILER_SMTP_USERNAME: preserve(),
      APPFLOWY_MAILER_SMTP_EMAIL: preserve(),
      APPFLOWY_MAILER_SMTP_PASSWORD: preserve(),
      APPFLOWY_MAILER_SMTP_TLS_KIND: preserve(),
      ASSEMBLYAI_API_KEY: preserve(),
    },
  });

  const adminFrontend = service("admin-frontend", {
    source: image("appflowyinc/admin_frontend:latest"),
    env: {
      APPFLOWY_GOTRUE_BASE_URL: varWithDescription(
        "http://${{gotrue.RAILWAY_PRIVATE_DOMAIN}}:9999",
        "Internal GoTrue URL for the admin console.",
      ),
      APPFLOWY_BASE_URL: varWithDescription(
        "http://${{appflowy-cloud.RAILWAY_PRIVATE_DOMAIN}}:8000",
        "Internal AppFlowy Cloud URL for the admin console.",
      ),
    },
  });

  const appflowyWeb = service("appflowy-web", {
    source: image("appflowyinc/appflowy_web:latest"),
    env: {
      APPFLOWY_BASE_URL: varWithDescription(
        baseUrl,
        "Public base URL used by the web client.",
      ),
      APPFLOWY_GOTRUE_BASE_URL: varWithDescription(
        `${baseUrl}/gotrue`,
        "Public GoTrue URL used by the web client.",
      ),
      APPFLOWY_WS_BASE_URL: varWithDescription(
        wsUrl,
        "Public WebSocket URL for realtime collaboration.",
      ),
    },
  });

  const appflowyWorker = service("appflowy-worker", {
    source: image("appflowyinc/appflowy_worker:latest"),
    env: {
      RUST_LOG: varWithDescription("info", "Log level for AppFlowy Worker."),
      APPFLOWY_ENVIRONMENT: varWithDescription(
        "production",
        "Worker runtime environment.",
      ),
      APPFLOWY_WORKER_REDIS_URL: varWithDescription(
        "${{redis.REDIS_URL}}",
        "Redis URL for background jobs.",
      ),
      APPFLOWY_WORKER_ENVIRONMENT: varWithDescription(
        "production",
        "Worker environment flag.",
      ),
      APPFLOWY_WORKER_DATABASE_URL: varWithDescription(
        dbUrl,
        "Postgres URL for the worker.",
      ),
      APPFLOWY_WORKER_DATABASE_NAME: varWithDescription(
        "${{postgres.POSTGRES_DB}}",
        "Postgres database name for the worker.",
      ),
      APPFLOWY_WORKER_IMPORT_TICK_INTERVAL: varWithDescription(
        "30",
        "Import job poll interval in seconds.",
      ),
      APPFLOWY_S3_USE_MINIO: varWithDescription(
        "true",
        "Use MinIO for worker file storage.",
      ),
      APPFLOWY_S3_MINIO_URL: varWithDescription(
        "http://${{minio.RAILWAY_PRIVATE_DOMAIN}}:9000",
        "Internal MinIO API URL.",
      ),
      APPFLOWY_S3_ACCESS_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_USER}}",
        "S3/MinIO access key.",
      ),
      APPFLOWY_S3_SECRET_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_PASSWORD}}",
        "S3/MinIO secret key.",
      ),
      APPFLOWY_S3_BUCKET: varWithDescription(
        "appflowy",
        "Object storage bucket name.",
      ),
      APPFLOWY_MAILER_SMTP_HOST: preserve(),
      APPFLOWY_MAILER_SMTP_PORT: preserve(),
      APPFLOWY_MAILER_SMTP_USERNAME: preserve(),
      APPFLOWY_MAILER_SMTP_EMAIL: preserve(),
      APPFLOWY_MAILER_SMTP_PASSWORD: preserve(),
      APPFLOWY_MAILER_SMTP_TLS_KIND: preserve(),
    },
  });

  const appflowyAi = service("appflowy-ai", {
    source: image("appflowyinc/appflowy_ai:latest"),
    healthcheck: "/health",
    healthcheckTimeout: 600,
    env: {
      AI_SERVER_PORT: varWithDescription(
        "5001",
        "AI service listen port on the private network.",
      ),
      OPENAI_API_KEY: preserve(),
      DEFAULT_AI_MODEL: varWithDescription(
        "gpt-4.1-mini",
        "Default OpenAI chat model (requires OPENAI_API_KEY).",
      ),
      DEFAULT_AI_COMPLETION_MODEL: varWithDescription(
        "gpt-4.1-mini",
        "Default OpenAI completion model.",
      ),
      AZURE_OPENAI_API_KEY: preserve(),
      AZURE_OPENAI_ENDPOINT: preserve(),
      AZURE_OPENAI_API_VERSION: preserve(),
      APPFLOWY_S3_ACCESS_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_USER}}",
        "S3/MinIO access key.",
      ),
      APPFLOWY_S3_SECRET_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_PASSWORD}}",
        "S3/MinIO secret key.",
      ),
      APPFLOWY_S3_BUCKET: varWithDescription(
        "appflowy",
        "Object storage bucket name.",
      ),
      AI_DATABASE_URL: varWithDescription(
        dbUrl,
        "Postgres URL for the AI service.",
      ),
      AI_REDIS_URL: varWithDescription(
        "${{redis.REDIS_URL}}",
        "Redis URL for the AI service.",
      ),
      AI_USE_MINIO: varWithDescription(
        "true",
        "Use MinIO for AI embeddings storage.",
      ),
      AI_MINIO_URL: varWithDescription(
        "http://${{minio.RAILWAY_PRIVATE_DOMAIN}}:9000",
        "Internal MinIO API URL.",
      ),
      AI_APPFLOWY_HOST: varWithDescription(
        baseUrl,
        "Public AppFlowy base URL.",
      ),
      APPFLOWY_GOTRUE_JWT_SECRET: varWithDescription(
        "${{gotrue.GOTRUE_JWT_SECRET}}",
        "Must match GoTrue JWT secret.",
      ),
    },
  });

  const appflowySearch = service("appflowy-search", {
    source: image("appflowyinc/appflowy_search:latest"),
    volumeMounts: {
      "/var/lib/appflowy/keyword_index": keywordIndex,
    },
    env: {
      RUST_LOG: varWithDescription("info", "Log level for AppFlowy Search."),
      APPFLOWY_SEARCH_HOST: varWithDescription(
        "[::]",
        "Search service bind address (dual-stack).",
      ),
      APPFLOWY_SEARCH_PORT: varWithDescription(
        "4002",
        "Search service listen port.",
      ),
      APPFLOWY_SEARCH_DATABASE_URL: varWithDescription(
        dbUrl,
        "Postgres URL for search indexing.",
      ),
      APPFLOWY_SEARCH_REDIS_URL: varWithDescription(
        "${{redis.REDIS_URL}}",
        "Redis URL for search.",
      ),
      AI_OPENAI_API_KEY: preserve(),
      AZURE_OPENAI_API_KEY: preserve(),
      AZURE_OPENAI_ENDPOINT: preserve(),
      AZURE_OPENAI_API_VERSION: preserve(),
      APPFLOWY_S3_USE_MINIO: varWithDescription(
        "true",
        "Use MinIO for collab blob reads during rebuild.",
      ),
      APPFLOWY_S3_MINIO_URL: varWithDescription(
        "http://${{minio.RAILWAY_PRIVATE_DOMAIN}}:9000",
        "Internal MinIO API URL.",
      ),
      APPFLOWY_S3_ACCESS_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_USER}}",
        "S3/MinIO access key.",
      ),
      APPFLOWY_S3_SECRET_KEY: varWithDescription(
        "${{minio.MINIO_ROOT_PASSWORD}}",
        "S3/MinIO secret key.",
      ),
      APPFLOWY_S3_BUCKET: varWithDescription(
        "appflowy",
        "Object storage bucket name.",
      ),
      APPFLOWY_BACKGROUND_INDEXER_ENABLED: varWithDescription(
        "true",
        "Enable background document indexing.",
      ),
      APPFLOWY_INDEXER_DATABASE_ENABLED: varWithDescription(
        "false",
        "Enable database indexer (optional).",
      ),
      APPFLOWY_KEYWORD_SEARCH_ENABLED: varWithDescription(
        "true",
        "Enable keyword search.",
      ),
      APPFLOWY_KEYWORD_WORKER_ENABLED: varWithDescription(
        "true",
        "Enable keyword index worker.",
      ),
      APPFLOWY_KEYWORD_INDEX_DIR: varWithDescription(
        "/var/lib/appflowy/keyword_index",
        "Persistent keyword index directory.",
      ),
      APPFLOWY_GOTRUE_JWT_SECRET: varWithDescription(
        "${{gotrue.GOTRUE_JWT_SECRET}}",
        "Must match GoTrue JWT secret.",
      ),
    },
  });

  const nginx = service("nginx", {
    source: empty(),
    rootDirectory: "/appflowy",
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "nginx/Dockerfile",
    },
    healthcheck: "/nginx-health",
    healthcheckTimeout: 600,
    env: {
      PORT: {
        description:
          "HTTP listen port. Set automatically by Railway for public routing.",
      },
      APPFLOWY_CLOUD_HOST: varWithDescription(
        "${{appflowy-cloud.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for AppFlowy Cloud.",
      ),
      APPFLOWY_CLOUD_PORT: varWithDescription(
        "8000",
        "AppFlowy Cloud private port.",
      ),
      GOTRUE_HOST: varWithDescription(
        "${{gotrue.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for GoTrue.",
      ),
      GOTRUE_PORT: varWithDescription("9999", "GoTrue private port."),
      ADMIN_FRONTEND_HOST: varWithDescription(
        "${{admin-frontend.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for Admin Frontend.",
      ),
      ADMIN_FRONTEND_PORT: varWithDescription(
        "3000",
        "Admin Frontend private port.",
      ),
      APPFLOWY_WEB_HOST: varWithDescription(
        "${{appflowy-web.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for AppFlowy Web.",
      ),
      APPFLOWY_WEB_PORT: varWithDescription("80", "AppFlowy Web private port."),
      MINIO_HOST: varWithDescription(
        "${{minio.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for MinIO.",
      ),
      MINIO_API_PORT: varWithDescription("9000", "MinIO API private port."),
      MINIO_CONSOLE_PORT: varWithDescription(
        "9001",
        "MinIO console private port.",
      ),
    },
  });

  return project("appflowy", {
    resources: [
      ...group("Gateway", [nginx]),
      ...group("Data", [postgres, cache, minio, pgData, minioData]),
      ...group("Auth", [gotrue]),
      ...group("App", [
        appflowyCloud,
        appflowyWeb,
        adminFrontend,
        appflowyWorker,
        appflowyAi,
        appflowySearch,
        keywordIndex,
      ]),
    ],
  });
});
