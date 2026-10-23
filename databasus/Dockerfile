FROM ghcr.io/databasus/databasus:v3.63.0

USER root

# Disable anonymous usage telemetry by default (upstream default is false = telemetry on).
ENV IS_DISABLE_ANONYMOUS_TELEMETRY=true

# Replace the Databasus binary with a thin wrapper that provisions the admin from
# DATABASUS_ADMIN_EMAIL / DATABASUS_ADMIN_PASSWORD on first boot, then closes
# external registration. Admins can re-enable sign-up in Databasus settings.
RUN mv /app/main /app/main.real
COPY entrypoint.sh /app/main
RUN chmod 0755 /app/main /app/main.real

# Keep upstream ENTRYPOINT (/app/start.sh).
