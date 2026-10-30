#!/usr/bin/env bash
# Firebase en el proyecto y el sitio de Hosting de staging. Requiere firebase-tools (npx firebase-tools@15.34.0).
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
FIREBASE=(npx --yes firebase-tools@15.34.0)

if ! grep -q "\"serviceId\": \"$SERVICE\", \"region\": \"$REGION\"" "$HERE/../../firebase.json"; then
  echo "firebase.json no apunta a $SERVICE en $REGION: corrige la redirección de /api/** antes de desplegar." >&2
  exit 1
fi
run "${FIREBASE[@]}" projects:addfirebase "$PROJECT_ID"
run "${FIREBASE[@]}" hosting:sites:create "$HOSTING_SITE" --project "$PROJECT_ID"

cat <<NEXT

Subdominio de pruebas (opcional, lo hace quien administra el DNS):
  Consola de Firebase → Hosting → $HOSTING_SITE → Agregar dominio personalizado, y crear los
  registros que indique. Después, cambiar PUBLIC_APP_URL en config.sh y repetir 04-cloud-run.sh.
NEXT
