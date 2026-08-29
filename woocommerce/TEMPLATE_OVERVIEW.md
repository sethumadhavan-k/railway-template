# Deploy and Host WooCommerce on Railway

WooCommerce is an open-source e-commerce plugin for WordPress. This template deploys WordPress with WooCommerce and the Storefront theme pre-installed, plus a managed MySQL database and persistent storage for uploads and plugins.

## About Hosting WooCommerce

Hosting WooCommerce on Railway provisions a two-service stack: MySQL and a custom WordPress image that installs WooCommerce via WP-CLI on first boot. Database credentials, site URL, and admin credentials are wired automatically. A volume at `/var/www/html/wp-content` keeps plugins, themes, and media across redeploys.

After deploy, generate a public domain on the **wordpress** service, then open `https://<your-domain>/wp-admin` and log in with `WORDPRESS_ADMIN_USER` / `WORDPRESS_ADMIN_PASSWORD` from the service Variables tab.

## Common Use Cases

- Online stores with product catalogs and checkout
- Staging or demo shops with optional generated test data
- Headless WooCommerce backends for custom frontends
- Agency client store kickstarts with preconfigured settings

## Dependencies for WooCommerce Hosting

- **MySQL Database** — Included in this template, connected over Railway's private network
- **Public domain on wordpress** — Required for `WORDPRESS_URL` and storefront access
- **GitHub repo with Dockerfile** — Railway builds the WordPress service from source

### Deployment Dependencies

- [WordPress Docker image](https://hub.docker.com/_/wordpress)
- [WooCommerce](https://woocommerce.com/)
- [Storefront theme](https://woocommerce.com/products/storefront/)
- [WC Smooth Generator](https://github.com/woocommerce/wc-smooth-generator) (optional demo data)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `WORDPRESS_ADMIN_USER` | Admin username (default: `storeadmin`) |
| `WORDPRESS_ADMIN_PASSWORD` | Auto-generated admin password — save this |
| `WORDPRESS_ADMIN_EMAIL` | Admin email (default: `admin@example.com`) |
| `WORDPRESS_URL` | Public site URL (uses Railway public domain) |
| `WOOCOMMERCE_STORE_COUNTRY` | Store location (default: `US:CA`) |
| `WOOCOMMERCE_CURRENCY` | Currency (default: `USD`) |
| `WOOCOMMERCE_GENERATE_DATA` | Seed demo products/orders (`true` / `false`) |

### Volume

| Service | Mount path | Purpose |
|---------|------------|---------|
| wordpress | `/var/www/html/wp-content` | Plugins, themes, uploads |

### Implementation Details

**Auto-setup:** On first boot, `setup.sh` installs WordPress (if needed), activates WooCommerce and Storefront, configures store country/currency, and optionally generates demo data.

**Private network:** MySQL is not exposed publicly; WordPress connects via `${{mysql.MYSQLHOST}}`.

**Healthcheck:** `/` with a 600-second timeout — first boot installs plugins and can take several minutes.

**PORT:** Apache binds to Railway-assigned `PORT` for external routing.

## Why Deploy WooCommerce on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying WooCommerce on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
