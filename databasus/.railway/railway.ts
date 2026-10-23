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

const requiredVar = (
  value: string,
  description: string,
): { value: string; description: string; isOptional: false } => ({
  value,
  description,
  isOptional: false,
});

const DATABASUS_ICON =
  "https://raw.githubusercontent.com/databasus/databasus/main/assets/logo-square.svg";

export default defineRailway((ctx) => {
  const storage = volume("databasus-data");
  const backups = bucket("databasus-backups");

  // Deploy from this directory (or GitHub rootDirectory databasus/) so Railway
  // builds the local Dockerfile that wraps ghcr.io/databasus/databasus:v3.63.0.
  const databasus = service("databasus", {
    icon: DATABASUS_ICON,
    volumeMounts: {
      "/databasus-data": storage,
    },
    env: {
      DATABASUS_ADMIN_EMAIL: requiredVar(
        "",
        "Admin login email. Created on first boot; sign in with this account.",
      ),
      DATABASUS_ADMIN_PASSWORD: requiredVar(
        "",
        "Admin password (min 8 chars). Created on first boot.",
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
