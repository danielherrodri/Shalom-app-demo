#!/usr/bin/env bash
# Secretos en Secret Manager, replicados solo en la región. Los valores nunca se muestran ni se
# guardan en archivos: se generan aquí o se leen del teclado, y viajan por entrada estándar.
# Si un secreto ya tiene versión, no se toca (para rotar, ver docs/infraestructura-staging.md).
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
P=(--project "$PROJECT_ID")

random() { python3 -c 'import secrets; print(secrets.token_urlsafe(48), end="")'; }
fernet() { python3 -c 'import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode(), end="")'; }

has_version() {
  [[ "$APLICAR" == 1 ]] && [[ -n "$(gcloud secrets versions list "$1" --limit 1 --format 'value(name)' "${P[@]}" 2>/dev/null)" ]]
}

# Guarda un valor como nueva versión. El valor llega por la entrada estándar.
store() {
  echo "+ gcloud secrets versions add $1 --data-file - (valor por entrada estándar, no se muestra)"
  if [[ "$APLICAR" == 1 ]]; then
    gcloud secrets versions add "$1" --data-file - "${P[@]}" >/dev/null
  else
    cat >/dev/null
  fi
}

for name in "${SECRETS[@]}"; do
  if missing gcloud secrets describe "$name" "${P[@]}"; then
    run gcloud secrets create "$name" --replication-policy user-managed --locations "$REGION" "${P[@]}"
  fi
  run gcloud secrets add-iam-policy-binding "$name" --member "serviceAccount:$RUNTIME_SA" \
    --role roles/secretmanager.secretAccessor "${P[@]}"
done

if ! has_version shalom-django-secret-key; then
  if [[ "$APLICAR" == 1 ]]; then random; else printf x; fi | store shalom-django-secret-key
fi
if ! has_version shalom-field-key; then
  if [[ "$APLICAR" == 1 ]]; then fernet; else printf x; fi | store shalom-field-key
fi

if ! has_version shalom-pgpassword; then
  if [[ "$APLICAR" == 1 ]]; then
    password="$(random)"
    # gcloud solo acepta la contraseña como argumento: queda unos instantes en la lista de procesos de
    # esta computadora, nunca en el historial ni en archivos.
    echo "+ gcloud sql users create $DB_USER --instance $SQL_INSTANCE --password (oculta)"
    if gcloud sql users describe "$DB_USER" --instance "$SQL_INSTANCE" "${P[@]}" >/dev/null 2>&1; then
      gcloud sql users set-password "$DB_USER" --instance "$SQL_INSTANCE" --password "$password" "${P[@]}"
    else
      gcloud sql users create "$DB_USER" --instance "$SQL_INSTANCE" --password "$password" "${P[@]}"
    fi
    printf '%s' "$password" | store shalom-pgpassword
    unset password
  else
    echo "+ gcloud sql users create $DB_USER --instance $SQL_INSTANCE --password (generada, oculta)"
    printf x | store shalom-pgpassword
  fi
fi

if ! has_version shalom-email-password; then
  if [[ "$APLICAR" == 1 ]]; then
    read -rsp "Clave SMTP de Brevo para $EMAIL_USER (no se muestra): " smtp
    echo
    printf '%s' "$smtp" | store shalom-email-password
    unset smtp
  else
    printf x | store shalom-email-password
  fi
fi
