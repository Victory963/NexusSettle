#!/bin/bash
set -euo pipefail

PROJECT=gen-lang-client-0545808033
REGION=asia-northeast1
SERVICE=nexus-settle
RUNTIME_SA="450090254354-compute@developer.gserviceaccount.com"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1
gcloud config set project "$PROJECT"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  compute.googleapis.com

EXTRA=()
if gcloud iam service-accounts describe "$RUNTIME_SA" >/dev/null 2>&1; then
  EXTRA+=(--service-account "$RUNTIME_SA")
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/aiplatform.user" \
    --condition=None
fi

WORKDIR="${HOME}/nexus-settle-src"
rm -rf "$WORKDIR"
git clone --depth 1 --branch main https://github.com/Victory963/NexusSettle.git "$WORKDIR"
cd "$WORKDIR"

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 2 \
  "${EXTRA[@]}" \
  --set-env-vars "CLEARING_MODE=demo,CLEARING_MAINNET_ENABLED=false,GOOGLE_CLOUD_PROJECT=${PROJECT},GEMINI_LOCATION=us-central1,GEMINI_MODEL=gemini-2.5-flash" \
  --quiet

if ! gcloud iam service-accounts describe "$RUNTIME_SA" >/dev/null 2>&1; then
  echo "Runtime service account was not found; Gemini calls will stay unavailable."
else
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/aiplatform.user" \
    --condition=None
fi

gcloud run services describe "$SERVICE" --region "$REGION" --format="value(status.url)"
