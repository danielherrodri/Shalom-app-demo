#!/usr/bin/env bash
# Tareas de Cloud Scheduler. Llaman directo a la URL run.app con un token OIDC de shalom-scheduler
# cuya audiencia es esa URL; la API verifica firma, audiencia y cuenta (core/internal.py).
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
P=(--project "$PROJECT_ID" --location "$REGION")

task() {
  local name="$1" schedule="$2" path="$3" deadline="$4"
  local args=(--schedule "$schedule" --time-zone America/Mexico_City --uri "$SERVICE_URL$path" --http-method POST
              --oidc-service-account-email "$SCHEDULER_SA" --oidc-token-audience "$SERVICE_URL"
              --attempt-deadline "$deadline" --max-retry-attempts 2 --min-backoff 30s)
  if missing gcloud scheduler jobs describe "$name" "${P[@]}"; then
    run gcloud scheduler jobs create http "$name" "${args[@]}" "${P[@]}"
  else
    run gcloud scheduler jobs update http "$name" "${args[@]}" "${P[@]}"
  fi
}

# Reintentos de correo cada 5 minutos (las esperas de la cola son 5, 10, 20 y 40 minutos).
task shalom-email-drain '*/5 * * * *' /internal/email/drain/ 60s
# Limpieza diaria: contadores de límites vencidos y cuerpos de correo fuera de su ventana.
task shalom-daily '17 3 * * *' /internal/daily/ 120s
