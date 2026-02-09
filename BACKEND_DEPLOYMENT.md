# Backend Deployment Guide

This guide will help you deploy the backend API so users can use the app without needing their own API keys.

## Option 1: Deploy to Youware (Recommended)

### Prerequisites
1. Youware account with project created
2. OpenRouter API key from https://openrouter.ai/settings/keys

### Steps

1. **Set the API Key Secret in Youware Dashboard**
   - Go to your Youware project settings
   - Navigate to "Secrets" or "Environment Variables"
   - Add a new secret:
     - Name: `OPENROUTER_API_KEY`
     - Value: `YOUR_OPENROUTER_API_KEY_HERE` (get from https://openrouter.ai/settings/keys)

2. **Deploy Backend**
   ```bash
   cd mentalist_stars_web/mentalist_stars_source_code/backend
   npm install
   npm run deploy
   ```

3. **Get Your Worker URL**
   - After deployment, Youware will provide a URL like:
     `https://your-project-name.youware.workers.dev`
   - Copy this URL

4. **Update Frontend Configuration**
   - Edit `.env.production` file in the root of the web app
   - Update `VITE_BACKEND_URL` with your worker URL:
     ```
     VITE_BACKEND_URL=https://your-project-name.youware.workers.dev
     ```

5. **Build Frontend**
   ```bash
   cd mentalist_stars_web/mentalist_stars_source_code
   npm run build
   ```

6. **Deploy Frontend**
   - The `dist/` folder contains your built frontend
   - Deploy it to your hosting service (Vercel, Netlify, Cloudflare Pages, etc.)

## Option 2: Deploy to Cloudflare Workers Directly

### Prerequisites
1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. OpenRouter API key

### Steps

1. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

2. **Set the API Key Secret**
   ```bash
   cd mentalist_stars_web/mentalist_stars_source_code/backend
   wrangler secret put OPENROUTER_API_KEY
   ```
   When prompted, paste your OpenRouter API key from https://openrouter.ai/settings/keys

3. **Deploy Backend**
   ```bash
   npm install
   wrangler deploy
   ```

4. **Get Your Worker URL**
   - Wrangler will output a URL like:
     `https://mentalist-stars-backend.your-subdomain.workers.dev`
   - Copy this URL

5. **Update Frontend & Deploy**
   - Follow steps 4-6 from Option 1 above

## Verify Deployment

1. **Test Backend Health**
   ```bash
   curl https://your-worker-url.workers.dev/api/health
   ```
   Should return: `{"status":"ok","service":"mentalist-ai-backend"}`

2. **Test Chat Endpoint**
   ```bash
   curl -X POST https://your-worker-url.workers.dev/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}]}'
   ```
   Should stream back a response from the AI.

## Frontend Configuration

Once backend is deployed, the frontend will automatically:
- ✅ Use the backend API (no user API key needed)
- ✅ Make all AI requests server-side
- ✅ Keep your API key secure

## Troubleshooting

**Error: "OPENROUTER_API_KEY not set"**
- Make sure you added the secret in your platform's dashboard
- Redeploy the backend after adding the secret

**CORS errors**
- Backend includes CORS headers by default
- If issues persist, check your frontend URL matches the deployment

**Backend not being used**
- Check `.env.production` has correct `VITE_BACKEND_URL`
- Make sure you rebuilt frontend after changing env file
- Check browser console for the backend URL being called

## Cost Considerations

- Backend runs on Cloudflare Workers (100k requests/day free tier)
- OpenRouter API costs vary by model (gpt-4o-mini is very affordable)
- Monitor usage at https://openrouter.ai/activity
