#!/usr/bin/env bash
# release_images.sh — build HuddleTag Docker images and (optionally) push to ECR
#
# Usage:
#   ./scripts/release_images.sh [VERSION]
#
# Examples:
#   ./scripts/release_images.sh          # defaults to VERSION=v1
#   ./scripts/release_images.sh v1.2.0

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

VERSION="${1:-v1}"

BACKEND_IMAGE="huddletag-backend:${VERSION}"
FRONTEND_IMAGE="huddletag-frontend:${VERSION}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Build ─────────────────────────────────────────────────────────────────────

echo "==> Building backend image: ${BACKEND_IMAGE}"
docker build \
  --tag "${BACKEND_IMAGE}" \
  "${REPO_ROOT}/backend"

echo "==> Building frontend image: ${FRONTEND_IMAGE}"
docker build \
  --tag "${FRONTEND_IMAGE}" \
  "${REPO_ROOT}/frontend"

echo ""
echo "Built images:"
docker images --filter "reference=huddletag-*:${VERSION}" --format "  {{.Repository}}:{{.Tag}}  ({{.Size}})"

# ── Push to ECR ───────────────────────────────────────────────────────────────
# TODO: implement ECR push
#
# Prerequisites:
#   export AWS_ACCOUNT_ID=123456789012
#   export AWS_REGION=us-east-1
#   export ECR_REPO_PREFIX="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/huddletag"
#
# Steps to implement:
#   1. Authenticate Docker to ECR:
#        aws ecr get-login-password --region "${AWS_REGION}" \
#          | docker login --username AWS --password-stdin \
#              "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
#
#   2. Tag images with ECR URI:
#        docker tag "${BACKEND_IMAGE}"  "${ECR_REPO_PREFIX}-backend:${VERSION}"
#        docker tag "${FRONTEND_IMAGE}" "${ECR_REPO_PREFIX}-frontend:${VERSION}"
#
#   3. Push:
#        docker push "${ECR_REPO_PREFIX}-backend:${VERSION}"
#        docker push "${ECR_REPO_PREFIX}-frontend:${VERSION}"

echo ""
echo "Done. To push to ECR, implement the push section in this script."
