# shellcheck shell=bash
# shellcheck disable=SC2034  # Los valores derivados los usan los scripts que cargan este archivo.
# Funciones comunes de los scripts de staging.
# Por omisión solo muestran los comandos (simulación). Con APLICAR=1 los ejecutan.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="${SHALOM_INFRA_CONFIG:-$HERE/config.sh}"
if [[ ! -f "$CONFIG" ]]; then
  echo "Falta $CONFIG: copia config.example.sh a config.sh y ajusta los valores." >&2
  exit 1
fi
# shellcheck source=config.example.sh
source "$CONFIG"
for name in PROJECT_ID PROJECT_NUMBER REGION SQL_INSTANCE SQL_TIER DB_NAME DB_USER REPOSITORY SERVICE \
            MIGRATE_JOB HOSTING_SITE PUBLIC_APP_URL EMAIL_HOST EMAIL_USER FROM_EMAIL GITHUB_REPOSITORY GITHUB_REPOSITORY_ID; do
  if [[ -z "${!name:-}" ]]; then
    echo "Falta $name en $CONFIG" >&2
    exit 1
  fi
done

APLICAR="${APLICAR:-0}"
RUNTIME_SA="shalom-api@${PROJECT_ID}.iam.gserviceaccount.com"
SCHEDULER_SA="shalom-scheduler@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="shalom-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_URL="https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
WIF_POOL="github"
WIF_PROVIDER="github-actions"
SECRETS=(shalom-django-secret-key shalom-field-key shalom-pgpassword shalom-email-password)

if [[ "$APLICAR" == 1 ]]; then
  echo "== Ejecutando en el proyecto $PROJECT_ID =="
else
  echo "== Simulación: no se crea nada. Repite con APLICAR=1 para ejecutar. =="
fi

# Muestra y, con APLICAR=1, ejecuta un comando. Nunca pasar secretos como argumento de run.
run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  if [[ "$APLICAR" == 1 ]]; then
    "$@"
  fi
}

# Verdadero si el recurso no existe. En simulación siempre es verdadero, sin llamar a Google.
missing() {
  [[ "$APLICAR" != 1 ]] || ! "$@" >/dev/null 2>&1
}
