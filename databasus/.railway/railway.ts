import {
  bucket,
  defineRailway,
  project,
  ref,
  service,
  volume,
} from "railway/iac";

const optionalVar = (
  value: string,
  description: string,
): { value: string; description: string; isOptional: true } => ({
  value,
  description,
  isOptional: true,
});

export default defineRailway((ctx) => {
  const storage = volume("databasus-data");
  const backups = bucket("databasus-backups");

  // Deploy from this directory (or GitHub rootDirectory databasus/) so Railway
  // builds the local Dockerfile that wraps ghcr.io/databasus/databasus:v3.63.0.
  const databasus = service("databasus", {
    healthcheck: "/api/v1/system/version",
    healthcheckTimeout: 300,
    volumeMounts: {
      "/databasus-data": storage,
    },
    env: {
      PORT: optionalVar("4005", "HTTP listen port. Databasus default is 4005."),
      DATABASUS_ADMIN_EMAIL: optionalVar(
        "",
        "Optional. If set with DATABASUS_ADMIN_PASSWORD, creates this admin on first boot. Leave empty to use UI Sign up.",
      ),
      DATABASUS_ADMIN_PASSWORD: optionalVar(
        "",
        "Optional. Admin password for Dockerfile bootstrap (min 8 chars). Leave empty to skip bootstrap.",
      ),
      DATABASUS_DISABLE_SIGNUP: optionalVar(
        "true",
        "Optional. When bootstrap runs, close open registration (default true).",
      ),
      IS_DISABLE_ANONYMOUS_TELEMETRY: optionalVar(
        "true",
        "Optional. Disable anonymous usage telemetry (default true).",
      ),
      DATABASUS_URL: optionalVar(
        "https://${{RAILWAY_PUBLIC_DOMAIN}}",
        "Optional. Public base URL used in email links.",
      ),
      S3_ENDPOINT: ref(backups, "ENDPOINT"),
      S3_BUCKET: ref(backups, "BUCKET"),
      S3_REGION: ref(backups, "REGION"),
      S3_ACCESS_KEY_ID: ref(backups, "ACCESS_KEY_ID"),
      S3_SECRET_ACCESS_KEY: ref(backups, "SECRET_ACCESS_KEY"),
    },
  });

  return project("databasus", {
    resources: [databasus, storage, backups],
  });
});
