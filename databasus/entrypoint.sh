#!/bin/bash
# Installed as /app/main. Wraps main.real so the first server start provisions
# an admin and optionally closes open registration before the web UI listens.
set -eu

readonly marker="/databasus-data/.railway-admin-bootstrapped"
readonly postgres_bin="/usr/lib/postgresql/17/bin"
readonly real_main="/app/main.real"

# CLI utilities (--create-user, --test-storage, --new-password, etc.) pass through.
if [ "$#" -gt 0 ]; then
  exec "${real_main}" "$@"
fi

railway_disable_signup() {
  local dsn_file="/dev/shm/databasus-database-dsn"
  local dsn=""

  if [ -n "${DATABASE_DSN:-}" ]; then
    dsn="${DATABASE_DSN}"
  elif [ -f "${dsn_file}" ]; then
    dsn="$(cat "${dsn_file}")"
  else
    echo "railway: DATABASE_DSN missing; cannot disable sign-up" >&2
    return 1
  fi

  local host="localhost" port="5437" user="postgres" password="" dbname="databasus"
  local key value
  # shellcheck disable=SC2086
  for pair in ${dsn}; do
    key="${pair%%=*}"
    value="${pair#*=}"
    case "${key}" in
      host) host="${value}" ;;
      port) port="${value}" ;;
      user) user="${value}" ;;
      password) password="${value}" ;;
      dbname) dbname="${value}" ;;
    esac
  done

  PGPASSWORD="${password}" "${postgres_bin}/psql" \
    -X -q -1 -v ON_ERROR_STOP=1 \
    -h "${host}" -p "${port}" -U "${user}" -d "${dbname}" \
    -c "INSERT INTO users_settings (is_allow_external_registrations) SELECT false WHERE NOT EXISTS (SELECT 1 FROM users_settings)" \
    -c "UPDATE users_settings SET is_allow_external_registrations = false"
}

railway_bootstrap() {
  if [ -f "${marker}" ]; then
    echo "railway: admin already provisioned on this volume"
    return 0
  fi

  local email="${DATABASUS_ADMIN_EMAIL:-}"
  local password="${DATABASUS_ADMIN_PASSWORD:-}"

  if [ -z "${email}" ] || [ -z "${password}" ]; then
    echo "railway: DATABASUS_ADMIN_EMAIL and DATABASUS_ADMIN_PASSWORD are required" >&2
    return 1
  fi

  echo "railway: creating admin ${email} before the web server starts"
  if ! "${real_main}" --create-user --email="${email}" --password="${password}" --role=admin; then
    echo "railway: admin creation failed" >&2
    return 1
  fi

  if [ "${DATABASUS_DISABLE_SIGNUP:-true}" = "true" ]; then
    if ! railway_disable_signup; then
      echo "railway: could not turn off sign-up; set DATABASUS_DISABLE_SIGNUP=false to skip" >&2
      return 1
    fi
    echo "railway: open sign-up turned off"
  fi

  touch "${marker}"
  echo "railway: bootstrap complete"
}

if ! railway_bootstrap; then
  exit 1
fi

exec "${real_main}"
