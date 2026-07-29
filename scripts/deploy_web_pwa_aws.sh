#!/usr/bin/env bash
set -euo pipefail

# QuranTrack canonical web/PWA deployment.
# This script is intentionally locked to Hamza's personal AWS account/profile.
PROFILE="hamza-admin"
EXPECTED_ACCOUNT="637282979276"
REGION="us-east-1"
BUCKET="qurantrack-app-637282979276"
DISTRIBUTION_ID="ELF0U79EJW574"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/quran_frontend"

ACCOUNT="$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)"
if [[ "$ACCOUNT" != "$EXPECTED_ACCOUNT" ]]; then
  echo "Refusing deployment: profile $PROFILE resolved to unexpected account $ACCOUNT" >&2
  exit 1
fi

echo "[1/5] Exporting versioned static Quran data"
python3 "$ROOT/scripts/export_quran_static_assets.py"

echo "[2/5] Building production frontend"
(
  cd "$FRONTEND"
  npm run build
)

echo "[3/5] Uploading immutable application/assets to private S3 origin"
aws s3 sync "$FRONTEND/dist/" "s3://$BUCKET/" \
  --delete \
  --profile "$PROFILE" \
  --region "$REGION" \
  --cache-control 'public,max-age=31536000,immutable' \
  --only-show-errors

echo "[4/5] Overriding mutable entry files with no-cache headers"
for file in index.html sw.js manifest.webmanifest; do
  case "$file" in
    index.html) content_type='text/html; charset=utf-8' ;;
    sw.js) content_type='application/javascript; charset=utf-8' ;;
    *) content_type='application/manifest+json' ;;
  esac
  aws s3 cp "$FRONTEND/dist/$file" "s3://$BUCKET/$file" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --cache-control 'no-cache,no-store,must-revalidate' \
    --content-type "$content_type" \
    --metadata-directive REPLACE \
    --only-show-errors
done

echo "[5/5] Invalidating CloudFront entry points"
INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths '/' '/index.html' '/sw.js' '/manifest.webmanifest' \
  --profile "$PROFILE" \
  --query 'Invalidation.Id' \
  --output text)"

echo "Deployment complete"
echo "URL: https://qurantrack.hamzas.world/"
echo "CloudFront invalidation: $INVALIDATION_ID"
