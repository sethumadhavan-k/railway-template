import {
  bucket,
  defineRailway,
  project,
  ref,
  service,
  volume,
} from "railway/iac";

const varWithDescription = (value: string, description: string) => ({
  value,
  description,
});

export default defineRailway((ctx) => {
  const storage = volume("databasus-data");
  const backups = bucket("databasus-backups");

  const databasus = service("databasus", {
    // Deploy from this directory so Railway builds the local Dockerfile.
    healthcheck: "/api/v1/system/version",
    healthcheckTimeout: 300,
    volumeMounts: {
      "/databasus-data": storage,
    },
    env: {
      DATABASUS_ADMIN_EMAIL: varWithDescription(
        "admin@example.com",
        "Administrator email created on first boot. Change at deploy time, then sign in with this address.",
      ),
      DATABASUS_ADMIN_PASSWORD: varWithDescription(
        ctx.randomString("admin-password", 24),
        "Administrator password (min 8 chars). Auto-generated; save from Variables after deploy.",
      ),
      DATABASUS_DISABLE_SIGNUP: varWithDescription(
        "true",
        "When true, open self-registration is turned off after the admin is created.",
      ),
      DATABASUS_URL: varWithDescription(
        "https://${{RAILWAY_PUBLIC_DOMAIN}}",
        "Public base URL used in email links. Generate a Railway domain first.",
      ),
      IS_DISABLE_ANONYMOUS_TELEMETRY: varWithDescription(
        "true",
        "Disable anonymous usage telemetry.",
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
