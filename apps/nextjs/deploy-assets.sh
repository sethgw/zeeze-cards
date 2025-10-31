#!/bin/bash
set -e

# Deploy static assets to Minio
# This script is called by Coolify before deploying the container

ASSET_PREFIX=${ASSET_PREFIX:-"https://s3.seff.ai/big-pub-bucket"}
MINIO_ENDPOINT=${MINIO_ENDPOINT:-"https://s3.seff.ai"}
MINIO_BUCKET=${MINIO_BUCKET:-"big-pub-bucket"}

echo "🚀 Building and extracting static assets..."

# Build and extract static assets
DOCKER_BUILDKIT=1 docker build \
  --target=static-assets \
  --build-arg ASSET_PREFIX="${ASSET_PREFIX}" \
  --output=./static-output \
  -f apps/nextjs/Dockerfile .

echo "📦 Uploading static assets to Minio..."

# Upload to Minio using mc (MinIO Client)
# Assumes mc is installed and configured with alias 'minio'
if command -v mc &> /dev/null; then
  mc cp --recursive ./static-output/.next/static minio/${MINIO_BUCKET}/.next/static/
  mc cp --recursive ./static-output/public minio/${MINIO_BUCKET}/public/
  echo "✅ Assets uploaded successfully to ${ASSET_PREFIX}"
else
  echo "⚠️  MinIO client (mc) not found. Install it from https://min.io/docs/minio/linux/reference/minio-mc.html"
  exit 1
fi

# Cleanup
rm -rf ./static-output

echo "🎉 Static asset deployment complete!"
