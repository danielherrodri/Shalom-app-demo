#!/usr/bin/env bash
# Workload Identity Federation: GitHub Actions entra como shalom-deploy sin llaves JSON, solo desde
# este repositorio (por identificador numérico) y desde el entorno protegido «staging».
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
P=(--project "$PROJECT_ID" --location global)
POOL="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WIF_POOL"

if missing gcloud iam workload-identity-pools describe "$WIF_POOL" "${P[@]}"; then
  run gcloud iam workload-identity-pools create "$WIF_POOL" --display-name "GitHub Actions" "${P[@]}"
fi
if missing gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" --workload-identity-pool "$WIF_POOL" "${P[@]}"; then
  run gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" --workload-identity-pool "$WIF_POOL" \
    --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.environment=assertion.environment" \
    --attribute-condition "assertion.repository_id == '$GITHUB_REPOSITORY_ID' && assertion.environment == 'staging'" "${P[@]}"
fi
run gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --project "$PROJECT_ID" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/$POOL/attribute.repository_id/$GITHUB_REPOSITORY_ID"

cat <<VARS

Variables del entorno «staging» en GitHub (Settings → Environments → staging → Variables).
Son identificadores, no secretos:
  GCP_PROJECT_ID=$PROJECT_ID
  GCP_REGION=$REGION
  GCP_WORKLOAD_IDENTITY_PROVIDER=$POOL/providers/$WIF_PROVIDER
  GCP_DEPLOY_SERVICE_ACCOUNT=$DEPLOY_SA
  FIREBASE_SITE=$HOSTING_SITE
VARS
