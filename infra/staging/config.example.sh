# Configuración de staging. Copia este archivo a config.sh (ignorado por Git) y cambia los valores.
# Solo identificadores: ningún secreto va aquí. Los secretos los genera o pide 03-secretos.sh
# y viajan directo a Secret Manager.

PROJECT_ID="shalom-staging-ejemplo"
# gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)'
PROJECT_NUMBER="000000000000"
# Firebase Hosting no reenvía a Cloud Run en northamerica-south1 y Cloud Scheduler no existe ahí
# (docs/infraestructura-staging.md). Si cambias la región o SERVICE, cambia también firebase.json.
REGION="us-central1"

SQL_INSTANCE="shalom-staging"
SQL_TIER="db-f1-micro"
DB_NAME="shalom"
DB_USER="shalom_app"

REPOSITORY="shalom"
SERVICE="shalom-api"
MIGRATE_JOB="shalom-migrate"

HOSTING_SITE="shalom-kids-staging"
# URL pública de la app: el sitio .web.app o el subdominio de pruebas cuando exista.
PUBLIC_APP_URL="https://shalom-kids-staging.web.app"
# Vacío hasta confirmar en staging cuántos proxies agregan entradas a X-Forwarded-For.
TRUSTED_PROXY_COUNT=""

EMAIL_HOST="smtp-relay.example.invalid"
EMAIL_USER="usuario-smtp@example.invalid"
FROM_EMAIL="Shalom <no-responder@example.invalid>"

GITHUB_REPOSITORY="danielherrodri/Shalom-app-demo"
# Identificador numérico del repositorio (no cambia si se renombra): Settings del repositorio o
# gh api repos/danielherrodri/Shalom-app-demo --jq .id
GITHUB_REPOSITORY_ID="000000000"
