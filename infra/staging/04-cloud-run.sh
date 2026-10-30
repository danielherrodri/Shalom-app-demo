#!/usr/bin/env bash
# Servicio de Cloud Run y Job de migración, con su configuración, sin desplegar código.
# La primera vez usan la imagen pública de ejemplo de Google; el flujo deploy-staging.yml pone la
# imagen real, corre las migraciones y actualiza el servicio. Repetir este script no cambia la imagen.
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
P=(--project "$PROJECT_ID" --region "$REGION")
PLACEHOLDER="us-docker.pkg.dev/cloudrun/container/hello"

proxies=()
if [[ -n "${TRUSTED_PROXY_COUNT:-}" ]]; then
  proxies=("@SHALOM_CLIENT_IP_HEADER=X-Forwarded-For@SHALOM_TRUSTED_PROXY_COUNT=$TRUSTED_PROXY_COUNT")
fi
# ^@^ cambia el separador de gcloud: los valores pueden llevar comas.
ENV="^@^SHALOM_ENV=production@DJANGO_ALLOWED_HOSTS=${SERVICE_URL#https://}@SHALOM_PUBLIC_APP_URL=$PUBLIC_APP_URL"
ENV+="@PGHOST=/cloudsql/$SQL_CONNECTION@PGDATABASE=$DB_NAME@PGUSER=$DB_USER"
ENV+="@SHALOM_EMAIL_HOST=$EMAIL_HOST@SHALOM_EMAIL_USER=$EMAIL_USER@SHALOM_FROM_EMAIL=$FROM_EMAIL"
ENV+="@SHALOM_SCHEDULER_SERVICE_ACCOUNT=$SCHEDULER_SA@SHALOM_SCHEDULER_AUDIENCE=$SERVICE_URL${proxies[*]:-}"
SECRET_REFS="DJANGO_SECRET_KEY=shalom-django-secret-key:latest,SHALOM_FIELD_KEY=shalom-field-key:latest"
SECRET_REFS+=",PGPASSWORD=shalom-pgpassword:latest,SHALOM_EMAIL_PASSWORD=shalom-email-password:latest"
COMMON=(--service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION" --set-env-vars "$ENV" --set-secrets "$SECRET_REFS")

# Conexiones: 2 workers × 4 hilos × 2 instancias = 16, debajo del límite de db-f1-micro (25).
SIZING=(--min-instances 0 --max-instances 2 --cpu 1 --memory 512Mi --concurrency 16 --timeout 30)
if missing gcloud run services describe "$SERVICE" "${P[@]}"; then
  # Público porque Firebase Hosting llama sin credenciales; la API exige sesión en cada ruta.
  run gcloud run deploy "$SERVICE" --image "$PLACEHOLDER" --allow-unauthenticated "${SIZING[@]}" "${COMMON[@]}" "${P[@]}"
else
  run gcloud run services update "$SERVICE" "${SIZING[@]}" "${COMMON[@]}" "${P[@]}"
fi

# shellcheck disable=SC2054  # Las comas separan los argumentos de gcloud, no del arreglo.
JOB=(--command python --args manage.py,migrate,--noinput --max-retries 0 --task-timeout 600)
if missing gcloud run jobs describe "$MIGRATE_JOB" "${P[@]}"; then
  run gcloud run jobs create "$MIGRATE_JOB" --image "$PLACEHOLDER" "${JOB[@]}" "${COMMON[@]}" "${P[@]}"
else
  run gcloud run jobs update "$MIGRATE_JOB" "${JOB[@]}" "${COMMON[@]}" "${P[@]}"
fi
