#!/bin/bash

# Run setup after WordPress files are ready
run_setup() {
  while [ ! -d /var/www/html/wp-content/plugins ]; do
    sleep 2
  done

  /usr/local/bin/setup-wordpress.sh
}

# Delay so docker-entrypoint can create wp-config.php first
(sleep 10 && run_setup) &

exec docker-entrypoint.sh "$@"
