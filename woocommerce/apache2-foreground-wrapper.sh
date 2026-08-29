#!/bin/bash
# Bind Apache to Railway PORT (or 80 locally) and fix MPM conflict

PORT="${PORT:-80}"

# Apache listens on PORT for Railway public networking
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf 2>/dev/null || true
sed -i "s/<VirtualHost \*:.*>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf 2>/dev/null || true

# Fix Apache MPM conflict right before Apache starts
rm -f /etc/apache2/mods-enabled/mpm_event.conf /etc/apache2/mods-enabled/mpm_event.load 2>/dev/null || true

exec apache2-foreground
