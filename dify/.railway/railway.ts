import {
  defineRailway,
  github,
  group,
  image,
  preserve,
  project,
  redis,
  service,
  volume,
} from "railway/iac";

const DIFY_API_IMAGE = "langgenius/dify-api:1.17.0";
const DIFY_WEB_IMAGE = "langgenius/dify-web:1.17.0";

/** GitHub monorepo containing dify/ (owner/repo). Required for template generation. */
const TEMPLATE_REPO =
  process.env.RAILWAY_TEMPLATE_REPO ?? "sethumadhavan-k/railway-template";

const templateDockerService = (
  name: string,
  dockerfilePath: string,
  config: Omit<Parameters<typeof service>[1], "source" | "rootDirectory" | "build">,
) =>
  service(name, {
    source: github(TEMPLATE_REPO),
    rootDirectory: "dify",
    build: {
      builder: "DOCKERFILE",
      dockerfilePath,
    },
    ...config,
  });

const varWithDescription = (value: string, description: string) => ({
  value,
  description,
});

export default defineRailway((ctx) => {
  const pgData = volume("postgres-data");
  const weaviateData = volume("weaviate-data");
  const minioData = volume("minio-data");
  const pluginData = volume("plugin-daemon-data");
  // Railway allows one volume per service; Dify compose uses two paths each for
  // sandbox and local-sandbox — we persist the primary path only.
  const sandboxData = volume("sandbox-data");
  const localSandboxData = volume("local-sandbox-data");

  const cache = redis("redis");

  const dbPassword = ctx.randomString("postgres-password", 32);
  const secretKey = ctx.randomString("secret-key", 42);
  const weaviateApiKey = ctx.randomString("weaviate-api-key", 32);
  const minioAccessKey = ctx.randomString("minio-access", 20);
  const minioSecretKey = ctx.randomString("minio-secret", 40);
  const pluginDaemonKey = ctx.randomString("plugin-daemon-key", 48);
  const pluginInnerApiKey = ctx.randomString("plugin-inner-api-key", 48);
  const sandboxApiKey = ctx.randomString("sandbox-api-key", 32);
  const agentApiToken = ctx.randomString("agent-api-token", 32);
  // Must decode to exactly 32 bytes (Dify agent backend requirement).
  const agentServerSecret =
    "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY";
  const localSandboxAuthToken = ctx.randomString("local-sandbox-auth-token", 32);

  const baseUrl = "https://${{nginx.RAILWAY_PUBLIC_DOMAIN}}";
  const dbHost = "${{postgres.RAILWAY_PRIVATE_DOMAIN}}";
  const dbUser = "${{postgres.POSTGRES_USER}}";
  const dbName = "${{postgres.POSTGRES_DB}}";
  const redisHost = "${{redis.RAILWAY_PRIVATE_DOMAIN}}";
  const redisPassword = "${{redis.REDIS_PASSWORD}}";
  const internalApiUrl = "http://${{dify-api.RAILWAY_PRIVATE_DOMAIN}}:5001";
  const minioEndpoint = "http://${{minio.RAILWAY_PRIVATE_DOMAIN}}:9000";

  const sharedBackendEnv = {
    DEPLOY_ENV: varWithDescription("PRODUCTION", "Dify deployment environment."),
    SECRET_KEY: varWithDescription(
      secretKey,
      "Application secret key. Auto-generated; do not change after first deploy.",
    ),
    DB_TYPE: varWithDescription("postgresql", "Database type."),
    DB_HOST: varWithDescription(dbHost, "PostgreSQL hostname on the private network."),
    DB_PORT: varWithDescription("5432", "PostgreSQL port."),
    DB_USERNAME: varWithDescription(dbUser, "PostgreSQL username."),
    DB_PASSWORD: varWithDescription(
      dbPassword,
      "PostgreSQL password. Auto-generated; do not change after first deploy.",
    ),
    DB_DATABASE: varWithDescription(dbName, "Primary Dify database name."),
    REDIS_HOST: varWithDescription(redisHost, "Redis hostname on the private network."),
    REDIS_PORT: varWithDescription("6379", "Redis port."),
    REDIS_PASSWORD: varWithDescription(
      redisPassword,
      "Redis password from the managed Redis service.",
    ),
    CELERY_BROKER_URL: varWithDescription(
      `redis://:${redisPassword}@${redisHost}:6379/1`,
      "Celery broker URL.",
    ),
    CONSOLE_API_URL: varWithDescription(
      baseUrl,
      "Public console API URL (nginx domain).",
    ),
    CONSOLE_WEB_URL: varWithDescription(
      baseUrl,
      "Public console web URL (nginx domain).",
    ),
    SERVICE_API_URL: varWithDescription(
      baseUrl,
      "Public service API URL (nginx domain).",
    ),
    APP_API_URL: varWithDescription(
      baseUrl,
      "Public app API URL (nginx domain).",
    ),
    APP_WEB_URL: varWithDescription(
      baseUrl,
      "Public app web URL (nginx domain).",
    ),
    FILES_URL: varWithDescription(
      baseUrl,
      "Public file access URL (nginx domain).",
    ),
    INTERNAL_FILES_URL: varWithDescription(
      internalApiUrl,
      "Internal file access URL for service-to-service communication.",
    ),
    TRIGGER_URL: varWithDescription(
      baseUrl,
      "Public trigger/webhook base URL.",
    ),
    ENDPOINT_URL_TEMPLATE: varWithDescription(
      `${baseUrl}/e/{hook_id}`,
      "Webhook endpoint URL template for plugins.",
    ),
    SERVER_CONSOLE_API_URL: varWithDescription(
      internalApiUrl,
      "Internal console API URL used by the web frontend.",
    ),
    VECTOR_STORE: varWithDescription("weaviate", "Vector database backend."),
    WEAVIATE_ENDPOINT: varWithDescription(
      "http://${{weaviate.RAILWAY_PRIVATE_DOMAIN}}:8080",
      "Weaviate HTTP endpoint on the private network.",
    ),
    WEAVIATE_API_KEY: varWithDescription(
      weaviateApiKey,
      "Weaviate API key. Auto-generated; must match weaviate service.",
    ),
    WEAVIATE_AUTHENTICATION_APIKEY_ALLOWED_KEYS: varWithDescription(
      weaviateApiKey,
      "Allowed Weaviate API keys.",
    ),
    STORAGE_TYPE: varWithDescription(
      "s3",
      "Storage backend: native S3 driver (auto-creates MinIO bucket on startup).",
    ),
    S3_ENDPOINT: varWithDescription(
      minioEndpoint,
      "MinIO S3 endpoint on the private network.",
    ),
    S3_REGION: varWithDescription(
      "us-east-1",
      "S3 region (required by boto3; use us-east-1 for MinIO).",
    ),
    S3_ADDRESS_STYLE: varWithDescription(
      "path",
      "S3 path-style URLs (required for MinIO).",
    ),
    S3_BUCKET_NAME: varWithDescription("dify", "S3 bucket for Dify file storage."),
    S3_ACCESS_KEY: varWithDescription(
      "${{minio.MINIO_ROOT_USER}}",
      "MinIO access key.",
    ),
    S3_SECRET_KEY: varWithDescription(
      "${{minio.MINIO_ROOT_PASSWORD}}",
      "MinIO secret key.",
    ),
    CODE_EXECUTION_ENDPOINT: varWithDescription(
      "http://${{sandbox.RAILWAY_PRIVATE_DOMAIN}}:8194",
      "Code sandbox endpoint on the private network.",
    ),
    CODE_EXECUTION_API_KEY: varWithDescription(
      sandboxApiKey,
      "API key for the code sandbox.",
    ),
    SANDBOX_API_KEY: varWithDescription(
      sandboxApiKey,
      "Sandbox API key (must match CODE_EXECUTION_API_KEY).",
    ),
    SSRF_PROXY_HTTP_URL: varWithDescription(
      "http://${{ssrf-proxy.RAILWAY_PRIVATE_DOMAIN}}:3128",
      "SSRF proxy URL for outbound sandbox requests.",
    ),
    SSRF_PROXY_HTTPS_URL: varWithDescription(
      "http://${{ssrf-proxy.RAILWAY_PRIVATE_DOMAIN}}:3128",
      "SSRF proxy URL for HTTPS sandbox requests.",
    ),
    PLUGIN_DAEMON_URL: varWithDescription(
      "http://${{plugin-daemon.RAILWAY_PRIVATE_DOMAIN}}:5002",
      "Plugin daemon URL on the private network.",
    ),
    PLUGIN_DAEMON_KEY: varWithDescription(
      pluginDaemonKey,
      "Plugin daemon authentication key.",
    ),
    PLUGIN_DIFY_INNER_API_URL: varWithDescription(
      internalApiUrl,
      "Internal Dify API URL for the plugin daemon.",
    ),
    PLUGIN_DIFY_INNER_API_KEY: varWithDescription(
      pluginInnerApiKey,
      "Inner API key for plugin daemon communication.",
    ),
    INNER_API_KEY_FOR_PLUGIN: varWithDescription(
      pluginInnerApiKey,
      "Inner API key shared by API/worker for plugin daemon.",
    ),
    AGENT_BACKEND_BASE_URL: varWithDescription(
      "http://${{agent-backend.RAILWAY_PRIVATE_DOMAIN}}:5050",
      "Agent backend URL on the private network.",
    ),
    AGENT_BACKEND_API_TOKEN: varWithDescription(
      agentApiToken,
      "Bearer token for the agent backend control-plane API.",
    ),
    DIFY_AGENT_API_TOKEN: varWithDescription(
      agentApiToken,
      "Agent API token (alias for agent backend).",
    ),
    DIFY_AGENT_REDIS_URL: varWithDescription(
      `redis://:${redisPassword}@${redisHost}:6379/2`,
      "Redis URL for the agent backend.",
    ),
    DIFY_AGENT_LOCAL_SANDBOX_ENDPOINT: varWithDescription(
      "http://${{local-sandbox.RAILWAY_PRIVATE_DOMAIN}}:5004",
      "Local agent sandbox endpoint.",
    ),
    DIFY_AGENT_LOCAL_SANDBOX_AUTH_TOKEN: varWithDescription(
      localSandboxAuthToken,
      "Auth token for local agent sandbox shellctl.",
    ),
    DIFY_AGENT_SANDBOX_FILES_BASE_URL: varWithDescription(
      internalApiUrl,
      "Dify API base URL reachable from agent sandbox via SSRF proxy.",
    ),
    DIFY_AGENT_RUNTIME_BACKEND: varWithDescription(
      "local",
      "Agent runtime backend (local sandbox).",
    ),
    MIGRATION_ENABLED: varWithDescription(
      "true",
      "Run database migrations on startup.",
    ),
    OPENAI_API_KEY: preserve(),
    OPENAI_API_BASE: preserve(),
    SMTP_SERVER: preserve(),
    SMTP_PORT: preserve(),
    SMTP_USERNAME: preserve(),
    SMTP_PASSWORD: preserve(),
    SMTP_USE_TLS: preserve(),
    MAIL_TYPE: preserve(),
  };

  const postgres = service("postgres", {
    source: image("postgres:15-alpine"),
    volumeMounts: {
      "/var/lib/postgresql/data": pgData,
    },
    env: {
      POSTGRES_USER: varWithDescription("postgres", "PostgreSQL superuser."),
      POSTGRES_PASSWORD: varWithDescription(
        dbPassword,
        "PostgreSQL password. Auto-generated; do not change after first deploy.",
      ),
      POSTGRES_DB: varWithDescription("dify", "Primary Dify database name."),
      PGDATA: varWithDescription(
        "/var/lib/postgresql/data/pgdata",
        "PostgreSQL data directory inside the volume.",
      ),
    },
  });

  const minio = service("minio", {
    source: image("minio/minio:latest"),
    start: "minio server /data --console-address :9001",
    volumeMounts: {
      "/data": minioData,
    },
    env: {
      MINIO_ROOT_USER: varWithDescription(
        minioAccessKey,
        "MinIO root access key for S3-compatible storage.",
      ),
      MINIO_ROOT_PASSWORD: varWithDescription(
        minioSecretKey,
        "MinIO root secret key.",
      ),
    },
  });

  const weaviate = service("weaviate", {
    source: image("semitechnologies/weaviate:1.27.0"),
    volumeMounts: {
      "/var/lib/weaviate": weaviateData,
    },
    env: {
      PERSISTENCE_DATA_PATH: varWithDescription(
        "/var/lib/weaviate",
        "Weaviate data directory.",
      ),
      QUERY_DEFAULTS_LIMIT: varWithDescription("25", "Default Weaviate query limit."),
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: varWithDescription(
        "true",
        "Allow anonymous Weaviate access on the private network.",
      ),
      DEFAULT_VECTORIZER_MODULE: varWithDescription(
        "none",
        "Weaviate vectorizer module (Dify handles embeddings).",
      ),
      CLUSTER_HOSTNAME: varWithDescription("node1", "Weaviate cluster hostname."),
      AUTHENTICATION_APIKEY_ENABLED: varWithDescription(
        "true",
        "Enable Weaviate API key authentication.",
      ),
      AUTHENTICATION_APIKEY_ALLOWED_KEYS: varWithDescription(
        weaviateApiKey,
        "Allowed Weaviate API keys.",
      ),
      AUTHENTICATION_APIKEY_USERS: varWithDescription(
        "hello@dify.ai",
        "Weaviate API key user.",
      ),
      AUTHORIZATION_ADMINLIST_ENABLED: varWithDescription(
        "true",
        "Enable Weaviate admin list.",
      ),
      AUTHORIZATION_ADMINLIST_USERS: varWithDescription(
        "hello@dify.ai",
        "Weaviate admin user.",
      ),
    },
  });

  const ssrfProxy = templateDockerService("ssrf-proxy", "ssrf-proxy/Dockerfile", {
    env: {
      HTTP_PORT: varWithDescription("3128", "Squid HTTP proxy port."),
      COREDUMP_DIR: varWithDescription(
        "/var/spool/squid",
        "Squid coredump directory.",
      ),
      SSRF_SANDBOX_PROXY_HOST: varWithDescription(
        "${{sandbox.RAILWAY_PRIVATE_DOMAIN}}",
        "Sandbox host for Squid reverse proxy bridge.",
      ),
      SANDBOX_PORT: varWithDescription("8194", "Sandbox listen port."),
    },
  });

  const agentSsrfProxy = templateDockerService(
    "agent-ssrf-proxy",
    "agent-ssrf-proxy/Dockerfile",
    {
      env: {
        HTTP_PORT: varWithDescription("3128", "Squid HTTP proxy port."),
        COREDUMP_DIR: varWithDescription(
          "/var/spool/squid",
          "Squid coredump directory.",
        ),
        AGENT_BACKEND_HOST: varWithDescription(
          "${{agent-backend.RAILWAY_PRIVATE_DOMAIN}}",
          "Agent backend hostname for SSRF allowlist.",
        ),
        API_HOST: varWithDescription(
          "${{dify-api.RAILWAY_PRIVATE_DOMAIN}}",
          "API hostname for SSRF allowlist (/files/*).",
        ),
      },
    },
  );

  // Railway healthchecks probe $PORT; set PORT to match the app listen port.
  const sandbox = service("sandbox", {
    source: image("langgenius/dify-sandbox:0.2.15"),
    healthcheck: "/health",
    healthcheckTimeout: 600,
    volumeMounts: {
      "/dependencies": sandboxData,
    },
    env: {
      PORT: varWithDescription(
        "8194",
        "Railway healthcheck port; must match SANDBOX_PORT.",
      ),
      API_KEY: varWithDescription(
        sandboxApiKey,
        "Sandbox API key.",
      ),
      GIN_MODE: varWithDescription("release", "Sandbox Gin mode."),
      WORKER_TIMEOUT: varWithDescription("15", "Sandbox worker timeout in seconds."),
      ENABLE_NETWORK: varWithDescription(
        "true",
        "Allow sandbox network access via SSRF proxy.",
      ),
      HTTP_PROXY: varWithDescription(
        "http://${{ssrf-proxy.RAILWAY_PRIVATE_DOMAIN}}:3128",
        "HTTP proxy for sandbox egress.",
      ),
      HTTPS_PROXY: varWithDescription(
        "http://${{ssrf-proxy.RAILWAY_PRIVATE_DOMAIN}}:3128",
        "HTTPS proxy for sandbox egress.",
      ),
      SANDBOX_PORT: varWithDescription("8194", "Sandbox listen port."),
    },
  });

  const difyApi = service("dify-api", {
    source: image(DIFY_API_IMAGE),
    healthcheck: "/health",
    healthcheckTimeout: 600,
    env: {
      ...sharedBackendEnv,
      PORT: varWithDescription(
        "5001",
        "Railway healthcheck port; must match DIFY_PORT.",
      ),
      MODE: varWithDescription("api", "Dify API process mode."),
      DIFY_PORT: varWithDescription("5001", "API listen port."),
      DIFY_AGENT_SERVER_SECRET_KEY: varWithDescription(
        agentServerSecret,
        "JWE encryption key for agent stub tokens. Must decode to 32 bytes; change in production.",
      ),
      INIT_PASSWORD: preserve(),
    },
  });

  const apiWebsocket = service("api-websocket", {
    source: image(DIFY_API_IMAGE),
    healthcheck: "/health",
    healthcheckTimeout: 600,
    env: {
      ...sharedBackendEnv,
      PORT: varWithDescription(
        "5001",
        "Railway healthcheck port; must match DIFY_PORT.",
      ),
      MODE: varWithDescription("api", "Dify API process mode (websocket)."),
      DIFY_PORT: varWithDescription("5001", "WebSocket listen port."),
      SERVER_WORKER_AMOUNT: varWithDescription("1", "Gunicorn worker count."),
      SERVER_WORKER_CLASS: varWithDescription(
        "geventwebsocket.gunicorn.workers.GeventWebSocketWorker",
        "Gunicorn worker class for WebSocket support.",
      ),
      SERVER_WORKER_CONNECTIONS: varWithDescription(
        "1000",
        "Max WebSocket connections per worker.",
      ),
      GUNICORN_TIMEOUT: varWithDescription("360", "Gunicorn worker timeout."),
    },
  });

  const worker = service("worker", {
    source: image(DIFY_API_IMAGE),
    env: {
      ...sharedBackendEnv,
      MODE: varWithDescription("worker", "Celery worker mode."),
    },
  });

  const workerBeat = service("worker-beat", {
    source: image(DIFY_API_IMAGE),
    env: {
      ...sharedBackendEnv,
      MODE: varWithDescription("beat", "Celery beat scheduler mode."),
    },
  });

  const web = service("web", {
    source: image(DIFY_WEB_IMAGE),
    env: {
      CONSOLE_API_URL: varWithDescription(
        baseUrl,
        "Public console API URL.",
      ),
      SERVER_CONSOLE_API_URL: varWithDescription(
        internalApiUrl,
        "Internal console API URL for server-side web requests.",
      ),
      APP_API_URL: varWithDescription(
        baseUrl,
        "Public app API URL.",
      ),
      NEXT_PUBLIC_SOCKET_URL: varWithDescription(
        "wss://${{nginx.RAILWAY_PUBLIC_DOMAIN}}",
        "Public WebSocket URL for collaboration.",
      ),
      MARKETPLACE_API_URL: varWithDescription(
        "https://marketplace.dify.ai",
        "Dify marketplace API URL.",
      ),
      MARKETPLACE_URL: varWithDescription(
        "https://marketplace.dify.ai",
        "Dify marketplace web URL.",
      ),
    },
  });

  const pluginDaemon = service("plugin-daemon", {
    source: image("langgenius/dify-plugin-daemon:0.6.10-local"),
    volumeMounts: {
      "/app/storage": pluginData,
    },
    env: {
      DB_TYPE: varWithDescription("postgresql", "Database type."),
      DB_HOST: varWithDescription(dbHost, "PostgreSQL hostname."),
      DB_PORT: varWithDescription("5432", "PostgreSQL port."),
      DB_USERNAME: varWithDescription(dbUser, "PostgreSQL username."),
      DB_PASSWORD: varWithDescription(
        dbPassword,
        "PostgreSQL password.",
      ),
      DB_DATABASE: varWithDescription(
        "dify_plugin",
        "Plugin daemon database name.",
      ),
      DB_SSL_MODE: varWithDescription("disable", "PostgreSQL SSL mode."),
      REDIS_HOST: varWithDescription(redisHost, "Redis hostname."),
      REDIS_PORT: varWithDescription("6379", "Redis port."),
      REDIS_PASSWORD: varWithDescription(redisPassword, "Redis password."),
      SERVER_PORT: varWithDescription("5002", "Plugin daemon listen port."),
      SERVER_KEY: varWithDescription(
        pluginDaemonKey,
        "Plugin daemon server key.",
      ),
      DIFY_INNER_API_URL: varWithDescription(
        internalApiUrl,
        "Internal Dify API URL.",
      ),
      DIFY_INNER_API_KEY: varWithDescription(
        pluginInnerApiKey,
        "Inner API key for plugin daemon.",
      ),
      PLUGIN_STORAGE_TYPE: varWithDescription(
        "local",
        "Plugin package storage type.",
      ),
      PLUGIN_STORAGE_LOCAL_ROOT: varWithDescription(
        "/app/storage",
        "Local plugin storage root.",
      ),
      PLUGIN_WORKING_PATH: varWithDescription(
        "/app/storage/cwd",
        "Plugin working directory.",
      ),
      FORCE_VERIFYING_SIGNATURE: varWithDescription(
        "true",
        "Verify plugin package signatures.",
      ),
    },
  });

  const agentBackend = service("agent-backend", {
    source: image("langgenius/dify-agent-backend:1.17.0"),
    env: {
      DIFY_AGENT_REDIS_URL: varWithDescription(
        `redis://:${redisPassword}@${redisHost}:6379/2`,
        "Redis URL for agent backend.",
      ),
      DIFY_AGENT_PLUGIN_DAEMON_URL: varWithDescription(
        "http://${{plugin-daemon.RAILWAY_PRIVATE_DOMAIN}}:5002",
        "Plugin daemon URL for agent backend.",
      ),
      DIFY_AGENT_PLUGIN_DAEMON_API_KEY: varWithDescription(
        pluginDaemonKey,
        "Plugin daemon API key for agent backend.",
      ),
      DIFY_AGENT_INNER_API_URL: varWithDescription(
        internalApiUrl,
        "Internal Dify API URL for agent backend.",
      ),
      DIFY_AGENT_INNER_API_KEY: varWithDescription(
        pluginInnerApiKey,
        "Inner API key for agent backend.",
      ),
      DIFY_AGENT_RUNTIME_BACKEND: varWithDescription(
        "local",
        "Agent runtime backend.",
      ),
      DIFY_AGENT_LOCAL_SANDBOX_ENDPOINT: varWithDescription(
        "http://${{local-sandbox.RAILWAY_PRIVATE_DOMAIN}}:5004",
        "Local sandbox endpoint.",
      ),
      DIFY_AGENT_LOCAL_SANDBOX_AUTH_TOKEN: varWithDescription(
        localSandboxAuthToken,
        "Local sandbox auth token.",
      ),
      DIFY_AGENT_STUB_API_BASE_URL: varWithDescription(
        "http://${{agent-backend.RAILWAY_PRIVATE_DOMAIN}}:5050/agent-stub",
        "Agent stub API base URL.",
      ),
      DIFY_AGENT_SANDBOX_FILES_BASE_URL: varWithDescription(
        internalApiUrl,
        "Dify API base for sandbox file transfers.",
      ),
      DIFY_AGENT_SERVER_SECRET_KEY: varWithDescription(
        agentServerSecret,
        "JWE encryption key for agent stub tokens.",
      ),
      DIFY_AGENT_API_TOKEN: varWithDescription(
        agentApiToken,
        "Agent backend API token.",
      ),
    },
  });

  // Railway healthchecks probe $PORT; shellctl listens on 5004.
  const localSandbox = service("local-sandbox", {
    source: image("langgenius/dify-agent-local-sandbox:1.17.0"),
    healthcheck: "/healthz",
    healthcheckTimeout: 600,
    volumeMounts: {
      "/workspace": localSandboxData,
    },
    env: {
      PORT: varWithDescription(
        "5004",
        "Railway healthcheck port; must match shellctl listen port.",
      ),
      SHELLCTL_AUTH_TOKEN: varWithDescription(
        localSandboxAuthToken,
        "Shellctl auth token for local sandbox.",
      ),
      HTTP_PROXY: varWithDescription(
        "http://${{agent-ssrf-proxy.RAILWAY_PRIVATE_DOMAIN}}:3128",
        "HTTP proxy for local sandbox egress.",
      ),
      HTTPS_PROXY: varWithDescription(
        "http://${{agent-ssrf-proxy.RAILWAY_PRIVATE_DOMAIN}}:3128",
        "HTTPS proxy for local sandbox egress.",
      ),
      NO_PROXY: varWithDescription(
        "localhost,127.0.0.1",
        "Hosts bypassing the SSRF proxy.",
      ),
    },
  });

  const nginx = templateDockerService("nginx", "nginx/Dockerfile", {
    healthcheck: "/nginx-health",
    healthcheckTimeout: 600,
    env: {
      PORT: {
        description:
          "HTTP listen port. Set automatically by Railway for public routing.",
      },
      API_HOST: varWithDescription(
        "${{dify-api.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for Dify API.",
      ),
      API_PORT: varWithDescription("5001", "Dify API private port."),
      WEB_HOST: varWithDescription(
        "${{web.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for Dify Web.",
      ),
      WEB_PORT: varWithDescription("8080", "Dify Web private port (Railway PORT)."),
      API_WEBSOCKET_HOST: varWithDescription(
        "${{api-websocket.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for API WebSocket service.",
      ),
      API_WEBSOCKET_PORT: varWithDescription("5001", "WebSocket private port."),
      PLUGIN_DAEMON_HOST: varWithDescription(
        "${{plugin-daemon.RAILWAY_PRIVATE_DOMAIN}}",
        "Private hostname for plugin daemon (webhooks at /e/).",
      ),
      PLUGIN_DAEMON_PORT: varWithDescription("5002", "Plugin daemon private port."),
      NGINX_PROXY_READ_TIMEOUT: varWithDescription(
        "3600s",
        "Proxy read timeout for long-running requests.",
      ),
      NGINX_PROXY_SEND_TIMEOUT: varWithDescription(
        "3600s",
        "Proxy send timeout for long-running requests.",
      ),
    },
  });

  return project("dify", {
    resources: [
      ...group("Gateway", [nginx]),
      ...group("Data", [
        postgres,
        cache,
        weaviate,
        minio,
        pgData,
        weaviateData,
        minioData,
      ]),
      ...group("Core", [difyApi, apiWebsocket, worker, workerBeat, web]),
      ...group("Plugins", [pluginDaemon, agentBackend, localSandbox, pluginData]),
      ...group("Security", [
        sandbox,
        ssrfProxy,
        agentSsrfProxy,
        sandboxData,
        localSandboxData,
      ]),
    ],
  });
});
