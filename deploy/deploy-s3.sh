#!/usr/bin/env bash
# One-shot deploy script for the S3 + CloudFront path.
#
# Usage:
#   AWS_REGION=ap-southeast-1 \
#   AWS_BUCKET=neu-cashier-fe-prod \
#   AWS_DISTRIBUTION_ID=E1XXXXXXXXXX \
#   VITE_NEU_API_BASE=https://api.neu.edu.ph \
#   ./deploy/deploy-s3.sh
#
# The script builds the SPA with Vite, syncs the `dist/` output to S3, and
# triggers a CloudFront cache invalidation. It is idempotent: running it
# twice in a row is safe.

set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${AWS_BUCKET:?AWS_BUCKET is required}"
: "${AWS_DISTRIBUTION_ID:?AWS_DISTRIBUTION_ID is required}"
: "${VITE_NEU_API_BASE:?VITE_NEU_API_BASE is required (e.g. https://api.neu.edu.ph)}"

echo "▶ Building SPA against API ${VITE_NEU_API_BASE}…"
cat > .env.production <<EOF
VITE_NEU_API_BASE=${VITE_NEU_API_BASE}
VITE_NEU_APP_NAME=${VITE_NEU_APP_NAME:-NEU Cashier Dashboard}
VITE_NEU_ENV_LABEL=${VITE_NEU_ENV_LABEL:-Production}
EOF

npm ci --no-audit --prefer-offline
npm run build

echo "▶ Syncing dist/ to s3://${AWS_BUCKET} (region ${AWS_REGION})…"

# Hashed assets: long, immutable cache.
aws s3 sync dist/ "s3://${AWS_BUCKET}" \
  --region "${AWS_REGION}" \
  --delete \
  --exclude "index.html" \
  --exclude "_redirects" \
  --cache-control "public, max-age=31536000, immutable"

# index.html / _redirects: never cache.
aws s3 cp dist/index.html "s3://${AWS_BUCKET}/index.html" \
  --region "${AWS_REGION}" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

if [ -f dist/_redirects ]; then
  aws s3 cp dist/_redirects "s3://${AWS_BUCKET}/_redirects" \
    --region "${AWS_REGION}" \
    --cache-control "no-cache, no-store, must-revalidate"
fi

echo "▶ Invalidating CloudFront ${AWS_DISTRIBUTION_ID}…"
aws cloudfront create-invalidation \
  --distribution-id "${AWS_DISTRIBUTION_ID}" \
  --paths "/index.html" "/_redirects" \
  --output text \
  --query 'Invalidation.Id'

echo "✓ Done."
