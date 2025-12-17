# Vercel Deployment Guide

## Common Issues and Solutions

### 1. **Environment Variables Missing**

**Problem**: Your app works locally but breaks on Vercel because environment variables aren't set.

**Solution**: 
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all required environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.rxn3d.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
NODE_ENV=production
```

**Important**: 
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Non-prefixed variables are only available server-side
- Make sure to set them for **Production**, **Preview**, and **Development** environments

### 2. **Build Failures**

**Common causes:**
- TypeScript errors (currently ignored in config)
- ESLint errors (currently ignored in config)
- Missing dependencies
- Node version mismatch

**Solutions:**
- Check Vercel build logs for specific errors
- Ensure `package.json` has all dependencies
- Verify Node.js version (Vercel uses Node 18.x by default)
- Run `npm run build` locally to catch issues early

### 3. **Runtime Errors**

**Common causes:**
- `API_BASE_URL` is empty string (causes API calls to fail)
- `localStorage` access during SSR
- Missing API endpoints

**Solutions:**
- Always set `NEXT_PUBLIC_API_BASE_URL` in Vercel
- Use `typeof window !== 'undefined'` checks before accessing `localStorage`
- Verify API endpoints are accessible from Vercel's servers

### 4. **Content Security Policy (CSP) Issues**

**Problem**: CSP headers might block resources on Vercel.

**Solution**: The CSP in `next.config.mjs` and `middleware.ts` is configured, but you may need to adjust:
- Add Vercel domains to `connect-src` if using Vercel Analytics
- Adjust `script-src` if using external scripts

### 5. **Image Optimization Issues**

**Problem**: Next.js image optimization might fail on Vercel.

**Solution**: 
- Ensure `sharp` is in dependencies (it is)
- Vercel automatically handles image optimization
- Check `remotePatterns` in `next.config.mjs` match your image sources

## Deployment Steps

### Initial Deployment

1. **Connect Repository to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   vercel
   ```

2. **Set Environment Variables**
   - Use Vercel dashboard or CLI:
   ```bash
   vercel env add NEXT_PUBLIC_API_BASE_URL
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   vercel env add STRIPE_SECRET_KEY
   ```

3. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Continuous Deployment

- Push to your main branch
- Vercel automatically deploys
- Check deployment logs in Vercel dashboard

## Docker Deployment (Alternative)

**Note**: Vercel doesn't support Docker containers directly. However, you can:

1. **Use Docker for other platforms** (AWS, Google Cloud, Azure, etc.)
2. **Use Vercel's native Next.js support** (recommended)

### For Docker Deployment Elsewhere:

1. **Build the production image:**
   ```bash
   docker build -f Dockerfile.prod -t rxn3d-frontend:prod .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_API_BASE_URL=https://api.rxn3d.com \
     -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key \
     rxn3d-frontend:prod
   ```

3. **Or use docker-compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Troubleshooting Checklist

- [ ] All environment variables are set in Vercel
- [ ] `NEXT_PUBLIC_API_BASE_URL` is not empty
- [ ] Build completes successfully locally (`npm run build`)
- [ ] No TypeScript/ESLint errors (check logs)
- [ ] API endpoints are accessible from internet
- [ ] CORS is configured on backend API
- [ ] Node version matches (18.x)
- [ ] All dependencies are in `package.json` (not just devDependencies)

## Getting Build Logs

```bash
# View latest deployment logs
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]
```

## Common Error Messages

### "API_BASE_URL is not defined"
- **Fix**: Set `NEXT_PUBLIC_API_BASE_URL` in Vercel environment variables

### "Module not found"
- **Fix**: Ensure all dependencies are in `dependencies`, not just `devDependencies`

### "Build failed"
- **Fix**: Check build logs, run `npm run build` locally first

### "500 Internal Server Error"
- **Fix**: Check runtime logs, verify environment variables, check API connectivity

## Next.js Standalone Output (For Docker)

To use the production Dockerfile, you need to enable standalone output in `next.config.mjs`:

```javascript
output: 'standalone',
```

This creates a minimal server.js file that can run independently.

