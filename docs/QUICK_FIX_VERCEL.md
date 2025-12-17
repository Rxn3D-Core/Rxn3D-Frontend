# Quick Fix for Vercel Deployment Issues

## Most Common Issue: Missing Environment Variables

**90% of Vercel deployment failures are due to missing environment variables.**

### Immediate Fix:

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add these REQUIRED variables:**

```env
NEXT_PUBLIC_API_BASE_URL=https://api.rxn3d.com
```

**Important**: Replace `https://api.rxn3d.com` with your actual API URL.

3. **If using Stripe, also add:**

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

4. **Redeploy** after adding variables:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

## Check Your Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the failed deployment
3. Check the "Build Logs" tab
4. Look for errors like:
   - `API_BASE_URL is not defined`
   - `Cannot read property of undefined`
   - `Network error`

## Quick Test

After setting environment variables, test locally:

```bash
# Set the environment variable
export NEXT_PUBLIC_API_BASE_URL=https://api.rxn3d.com

# Build
npm run build

# Start
npm run start
```

If it works locally with the env var, it should work on Vercel.

## Why It Works Locally But Not on Vercel

- **Local**: You might have a `.env.local` file with variables
- **Vercel**: No `.env.local` file - must set variables in dashboard
- **Solution**: Set all `NEXT_PUBLIC_*` variables in Vercel dashboard

## Docker Alternative (Not for Vercel)

**Vercel doesn't support Docker containers.** However, you can:

1. **Use Docker on other platforms** (AWS, DigitalOcean, Railway, etc.)
2. **Use the production Dockerfile** I created: `Dockerfile.prod`

To deploy with Docker elsewhere:

```bash
# Build
docker build -f Dockerfile.prod -t rxn3d-frontend .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=https://api.rxn3d.com \
  rxn3d-frontend
```

## Still Broken?

1. **Check the exact error** in Vercel build logs
2. **Verify API is accessible** from the internet (not just localhost)
3. **Check CORS settings** on your backend API
4. **Verify Node version** (Vercel uses 18.x by default)

