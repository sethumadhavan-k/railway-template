FROM ghcr.io/databasus/databasus:v3.63.0

USER root

# Replace the Databasus binary with a thin wrapper that provisions the admin
# account (and closes open sign-up) on first boot, then execs the real binary.
RUN mv /app/main /app/main.real
COPY entrypoint.sh /app/main
RUN chmod 0755 /app/main /app/main.real

# Keep upstream ENTRYPOINT (/app/start.sh).
