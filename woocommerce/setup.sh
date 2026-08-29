#!/bin/bash
# Don't use set -e so script continues even if some commands fail

cd /var/www/html

echo "Waiting for WordPress configuration..."
while [ ! -f /var/www/html/wp-config.php ]; do
  sleep 2
done

echo "Waiting for database connection..."
for i in $(seq 1 30); do
  if wp db check --allow-root 2>/dev/null; then
    echo "Database connected!"
    break
  fi
  echo "Database not ready, attempt $i/30..."
  sleep 3
done

if ! wp core is-installed --allow-root 2>/dev/null; then
  if [ -z "${WORDPRESS_ADMIN_USER}" ] || [ -z "${WORDPRESS_ADMIN_PASSWORD}" ] || [ -z "${WORDPRESS_ADMIN_EMAIL}" ]; then
    echo "Admin credentials not provided. Complete WordPress setup via the web wizard."
    exit 0
  else
    echo "Installing WordPress..."
    wp core install \
      --url="${WORDPRESS_URL:-http://localhost}" \
      --title="${WORDPRESS_TITLE:-My WooCommerce Site}" \
      --admin_user="${WORDPRESS_ADMIN_USER}" \
      --admin_password="${WORDPRESS_ADMIN_PASSWORD}" \
      --admin_email="${WORDPRESS_ADMIN_EMAIL}" \
      --skip-email \
      --allow-root
    echo "WordPress installed successfully!"
  fi
fi

echo "Setting permalink structure..."
wp rewrite structure '/%postname%/' --allow-root
wp rewrite flush --allow-root

echo "Removing default plugins..."
wp plugin delete akismet --allow-root 2>/dev/null || true
wp plugin delete hello --allow-root 2>/dev/null || true

if ! wp plugin is-active woocommerce --allow-root 2>/dev/null; then
  echo "Installing WooCommerce..."
  for i in 1 2 3; do
    wp plugin install woocommerce --activate --allow-root && break
    echo "WooCommerce install attempt $i failed, retrying..."
    sleep 5
  done
  if wp plugin is-active woocommerce --allow-root 2>/dev/null; then
    echo "WooCommerce installed and activated!"
  else
    echo "WARNING: WooCommerce installation failed. Install manually from wp-admin."
  fi
fi

if ! wp theme is-installed storefront --allow-root 2>/dev/null; then
  echo "Installing Storefront theme..."
  wp theme install storefront --activate --allow-root
elif ! wp theme is-active storefront --allow-root 2>/dev/null; then
  echo "Activating Storefront theme..."
  wp theme activate storefront --allow-root
else
  echo "Storefront theme already active."
fi

if [ -n "${WOOCOMMERCE_STORE_COUNTRY}" ]; then
  echo "Configuring WooCommerce store settings..."
  wp option update woocommerce_default_country "${WOOCOMMERCE_STORE_COUNTRY}" --allow-root
  if [ -n "${WOOCOMMERCE_CURRENCY}" ]; then
    wp option update woocommerce_currency "${WOOCOMMERCE_CURRENCY}" --allow-root
  fi
  wp option update woocommerce_onboarding_profile '{"completed":true}' --format=json --allow-root
  wp option update woocommerce_task_list_complete 1 --allow-root
  echo "WooCommerce setup wizard disabled!"
fi

if ! wp plugin is-active wc-smooth-generator --allow-root 2>/dev/null; then
  if ! wp plugin is-installed wc-smooth-generator --allow-root 2>/dev/null; then
    echo "Installing wc-smooth-generator plugin..."
    wp plugin install https://github.com/woocommerce/wc-smooth-generator/releases/latest/download/wc-smooth-generator.zip --allow-root
  fi
  wp plugin activate wc-smooth-generator --allow-root 2>/dev/null || true
fi

if [ "${WOOCOMMERCE_GENERATE_DATA}" = "true" ]; then
  PRODUCT_COUNT=$(wp post list --post_type=product --format=count --allow-root 2>/dev/null || echo "0")
  if [ "$PRODUCT_COUNT" -eq "0" ]; then
    echo "Generating demo WooCommerce data..."
    wp wc generate terms product_cat 50 --max-depth=3 --allow-root 2>/dev/null || true
    wp wc generate products 50 --use-existing-terms --allow-root 2>/dev/null || true
    wp wc generate customers 20 --allow-root 2>/dev/null || true
    wp wc generate orders 30 --allow-root 2>/dev/null || true
    echo "Demo data generation complete!"
  else
    echo "Products already exist ($PRODUCT_COUNT found), skipping data generation."
  fi
else
  echo "Demo data generation disabled (WOOCOMMERCE_GENERATE_DATA != true)."
fi

echo "WordPress setup complete!"
