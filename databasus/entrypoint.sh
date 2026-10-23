#!/bin/bash
# Installed as /app/main. Wraps main.real so the first server start provisions
# an admin from DATABASUS_ADMIN_EMAIL / DATABASUS_ADMIN_PASSWORD, then closes
# open registration. Admins can re-enable sign-up in Databasus settings.
set -eu

readonly marker="/databasus-data/.railway-admin-bootstrapped"
readonly postgres_bin="/usr/lib/postgresql/17/bin"
readonly real_main="/app/main.real"

# CLI utilities (--create-user, --test-storage, --new-password, etc.) pass through.
if [ "$#" -gt 0 ]; then
  exec "${real_main}" "$@"
fi

railway_users_settings_dsn() {
  local dsn_file="/dev/shm/databasus-database-dsn"

  if [ -n "${DATABASE_DSN:-}" ]; then
    echo "${DATABASE_DSN}"
  elif [ -f "${dsn_file}" ]; then
    cat "${dsn_file}"
  else
    return 1
  fi
}

railway_psql() {
  local dsn host="localhost" port="5437" user="postgres" password="" dbname="databasus"
  local key value

  dsn="$(railway_users_settings_dsn)" || return 1

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
    "$@"
}

railway_set_external_registrations() {
  local allow="$1"

  railway_psql \
    -c "INSERT INTO users_settings (is_allow_external_registrations) SELECT ${allow} WHERE NOT EXISTS (SELECT 1 FROM users_settings)" \
    -c "UPDATE users_settings SET is_allow_external_registrations = ${allow}"
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

  if ! railway_set_external_registrations false; then
    echo "railway: could not turn off external registration" >&2
    return 1
  fi
  echo "railway: external registration disabled (enable in Databasus settings if needed)"

  touch "${marker}"
  echo "railway: bootstrap complete"
}

if ! railway_bootstrap; then
  exit 1
fi

exec "${real_main}"
