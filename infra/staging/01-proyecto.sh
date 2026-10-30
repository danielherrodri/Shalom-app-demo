#!/usr/bin/env bash
# APIs, repositorio de imágenes y cuentas de servicio con permisos mínimos.
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
P=(--project "$PROJECT_ID")

run gcloud services enable run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com \
  cloudscheduler.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  firebase.googleapis.com firebasehosting.googleapis.com "${P[@]}"

if missing gcloud artifacts repositories describe "$REPOSITORY" --location "$REGION" "${P[@]}"; then
  run gcloud artifacts repositories create "$REPOSITORY" --repository-format docker --location "$REGION" \
    --description "Imágenes de la API de Shalom" "${P[@]}"
fi

# shalom-api: identidad del servicio y del Job de migración.
# shalom-scheduler: solo firma los tokens OIDC con que Cloud Scheduler llama a /internal/.
# shalom-deploy: la usa GitHub Actions por Workload Identity Federation, sin llaves JSON.
for account in shalom-api shalom-scheduler shalom-deploy; do
  if missing gcloud iam service-accounts describe "${account}@${PROJECT_ID}.iam.gserviceaccount.com" "${P[@]}"; then
    run gcloud iam service-accounts create "$account" --display-name "$account" "${P[@]}"
  fi
done

run gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$RUNTIME_SA" --role roles/cloudsql.client --condition None
for role in roles/run.developer roles/firebasehosting.admin roles/serviceusage.serviceUsageConsumer; do
  run gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$DEPLOY_SA" --role "$role" --condition None
done
run gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" --location "$REGION" \
  --member "serviceAccount:$DEPLOY_SA" --role roles/artifactregistry.writer "${P[@]}"
# Desplegar con la identidad shalom-api, sin poder usar ninguna otra cuenta.
run gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member "serviceAccount:$DEPLOY_SA" --role roles/iam.serviceAccountUser "${P[@]}"
