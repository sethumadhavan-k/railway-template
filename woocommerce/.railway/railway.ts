import {
  defineRailway,
  empty,
  mysql,
  project,
  service,
  volume,
} from "railway/iac";

const varWithDescription = (value: string, description: string) => ({
  value,
  description,
});

export default defineRailway((ctx) => {
  const db = mysql("mysql");
  const storage = volume("wp-content");

  const wordpress = service("wordpress", {
    source: empty(),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
    },
    healthcheck: "/",
    healthcheckTimeout: 600,
    volumeMounts: {
      "/var/www/html/wp-content": storage,
    },
    env: {
      PORT: varWithDescription(
        "${{PORT}}",
        "HTTP listen port. Uses Railway-assigned PORT for Apache.",
      ),
      WORDPRESS_DB_HOST: varWithDescription(
        "${{mysql.MYSQLHOST}}:${{mysql.MYSQLPORT}}",
        "MySQL host and port on Railway's private network.",
      ),
      WORDPRESS_DB_USER: varWithDescription(
        "${{mysql.MYSQLUSER}}",
        "MySQL username. References the managed mysql service.",
      ),
      WORDPRESS_DB_PASSWORD: varWithDescription(
        "${{mysql.MYSQLPASSWORD}}",
        "MySQL password. References the managed mysql service.",
      ),
      WORDPRESS_DB_NAME: varWithDescription(
        "${{mysql.MYSQLDATABASE}}",
        "MySQL database name. References the managed mysql service.",
      ),
      WORDPRESS_URL: varWithDescription(
        "https://${{wordpress.RAILWAY_PUBLIC_DOMAIN}}",
        "Public site URL. Generate a public domain on the wordpress service.",
      ),
      WORDPRESS_TITLE: varWithDescription(
        "My WooCommerce Site",
        "Site title used during WordPress installation.",
      ),
      WORDPRESS_ADMIN_USER: varWithDescription(
        "storeadmin",
        "WordPress admin username. Avoid using 'admin' for security.",
      ),
      WORDPRESS_ADMIN_PASSWORD: varWithDescription(
        ctx.randomString("admin-password", 32),
        "WordPress admin password. Save this value — required to log in at /wp-admin.",
      ),
      WORDPRESS_ADMIN_EMAIL: varWithDescription(
        "admin@example.com",
        "WordPress admin email address.",
      ),
      WOOCOMMERCE_STORE_COUNTRY: varWithDescription(
        "US:CA",
        "Store location (e.g. US:CA for California, GB for UK).",
      ),
      WOOCOMMERCE_CURRENCY: varWithDescription(
        "USD",
        "Store currency code (USD, EUR, GBP, etc.).",
      ),
      WOOCOMMERCE_GENERATE_DATA: varWithDescription(
        "true",
        "Generate demo products, customers, and orders on first deploy.",
      ),
    },
  });

  return project("woocommerce", {
    resources: [db, wordpress, storage],
  });
});
