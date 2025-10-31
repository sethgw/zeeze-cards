# Deploying to Coolify with CDN Assets

This app uses Minio/S3 for hosting static assets (JS, CSS, images) to reduce container size and improve performance.

## Setup Overview

1. **Push to GitHub** → triggers GitHub Action
2. **GitHub Action** → calls Coolify webhook
3. **Coolify pre-deploy** → uploads static assets to Minio
4. **Coolify build** → builds container with ASSET_PREFIX
5. **Coolify deploy** → deploys container

## Setup Steps

### 1. GitHub Actions Setup

A workflow already exists at `.github/workflows/deploy-nextjs.yml` that triggers on:

- Push to `main` branch (when nextjs or packages change)
- Manual workflow dispatch

**Add GitHub Secret:**

1. Go to your repo → Settings → Secrets → Actions
2. Add secret: `COOLIFY_WEBHOOK_URL`
3. Value: Your Coolify webhook URL (found in Coolify project settings)

### 2. Coolify Configuration

In your Coolify project settings:

**Build Pack:** Dockerfile
**Dockerfile Location:** `apps/nextjs/Dockerfile`

**Pre-deployment Command:**

```bash
./apps/nextjs/deploy-assets.sh
```

**Build Arguments:**

```
ASSET_PREFIX=https://s3.seff.ai/big-pub-bucket
```

**Environment Variables:**

- `MINIO_ENDPOINT=https://s3.seff.ai`
- `MINIO_BUCKET=big-pub-bucket`
- `MINIO_ACCESS_KEY=<your-key>` (if needed for mc config)
- `MINIO_SECRET_KEY=<your-secret>` (if needed for mc config)

### 3. Install MinIO Client on Coolify Server

SSH into your Coolify server and run:

```bash
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs \
  -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Configure mc with your Minio instance
mc alias set minio https://s3.seff.ai YOUR_ACCESS_KEY YOUR_SECRET_KEY

# Test it works
mc ls minio/big-pub-bucket
```

## Manual Deployment (Local Testing)

```bash
# 1. Upload assets
./apps/nextjs/deploy-assets.sh

# 2. Build container
docker build \
  --build-arg ASSET_PREFIX=https://s3.seff.ai/big-pub-bucket \
  -f apps/nextjs/Dockerfile \
  -t zeeze-nextjs:latest .

# 3. Deploy container
docker run -p 3000:3000 zeeze-nextjs:latest
```

## Testing Locally (without CDN)

To test without CDN (all assets served from container):

```bash
docker build -f apps/nextjs/Dockerfile -t zeeze-nextjs:dev .
docker run -p 3000:3000 zeeze-nextjs:dev
```

## Workflow

**Normal deployment flow:**

1. Make changes to `apps/nextjs/` or `packages/`
2. Commit and push to `main` branch
3. GitHub Action automatically triggers Coolify webhook
4. Coolify runs pre-deploy script → uploads assets to Minio
5. Coolify builds and deploys container
6. Done! Assets served from CDN, app from container

**Manual trigger:**

- Go to Actions tab in GitHub → "Deploy Next.js to Coolify" → Run workflow

## Troubleshooting

**Assets not loading?**

- Check that ASSET_PREFIX matches your Minio public URL
- Verify Minio bucket is public or has correct CORS settings
- Check browser network tab for 404s

**Upload failing?**

- Ensure mc is installed and configured
- Test with: `mc ls minio/big-pub-bucket`
- Check Minio credentials are correct
