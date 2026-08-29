FROM wordpress:latest

# Install WP-CLI and MySQL client for setup scripts
RUN apt-get update && apt-get install -y default-mysql-client \
  && rm -rf /var/lib/apt/lists/* \
  && curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
  && chmod +x wp-cli.phar \
  && mv wp-cli.phar /usr/local/bin/wp

COPY setup.sh /usr/local/bin/setup-wordpress.sh
COPY entrypoint.sh /usr/local/bin/custom-entrypoint.sh
COPY apache2-foreground-wrapper.sh /usr/local/bin/apache2-foreground-wrapper.sh
RUN chmod +x /usr/local/bin/setup-wordpress.sh \
  /usr/local/bin/custom-entrypoint.sh \
  /usr/local/bin/apache2-foreground-wrapper.sh

ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
CMD ["apache2-foreground-wrapper.sh"]
