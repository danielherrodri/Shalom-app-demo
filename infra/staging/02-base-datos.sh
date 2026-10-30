#!/usr/bin/env bash
# Instancia de Cloud SQL (PostgreSQL 17) y base de datos. El usuario y su contraseña los crea 03-secretos.sh.
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
P=(--project "$PROJECT_ID")

# IP pública sin redes autorizadas: solo entran los conectores de Cloud SQL (Cloud Run, Auth Proxy),
# que presentan certificado de cliente. Sin alta disponibilidad: es staging, con datos ficticios.
if missing gcloud sql instances describe "$SQL_INSTANCE" "${P[@]}"; then
  run gcloud sql instances create "$SQL_INSTANCE" --database-version POSTGRES_17 --edition ENTERPRISE \
    --tier "$SQL_TIER" --region "$REGION" --availability-type zonal --storage-type SSD --storage-size 10 \
    --storage-auto-increase --backup-start-time 09:00 --ssl-mode TRUSTED_CLIENT_CERTIFICATE_REQUIRED \
    --deletion-protection "${P[@]}"
fi
if missing gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" "${P[@]}"; then
  run gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE" "${P[@]}"
fi
