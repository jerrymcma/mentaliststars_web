# 🌐 Custom Domain Setup: mentaliststars.com

Complete guide to setting up your custom domain across all services.

---

## 🚀 Part 1: Vercel (Frontend Deployment)

### Step 1: Deploy to Vercel
1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Connect your GitHub account if not already connected
4. Select your repository: `jerrymcma/mentaliststars_web`
5. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `mentalist_stars_web/mentalist_stars_source_code`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Click **"Deploy"**

### Step 2: Add Custom Domain in Vercel
1. After deployment, go to your project in Vercel dashboard
2. Click **"Settings"** → **"Domains"**
3. Add these domains:
   - `mentaliststars.com` (primary)
   - `www.mentaliststars.com` (redirect to primary)
4. Vercel will show you DNS records to add

### Step 3: Configure DNS in Google Workspace/Domains
1. Go to Google Domains or your DNS provider
2. Add these DNS records (Vercel will provide the exact values):

   **For mentaliststars.com:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel's IP - check Vercel for current IP)
   TTL: 3600
   ```

   **For www.mentaliststars.com:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. Click **"Save"**
4. Wait 5-30 minutes for DNS propagation

### Step 4: Verify in Vercel
1. Return to Vercel → Domains
2. Click **"Refresh"** next to your domains
3. Once verified, Vercel will automatically issue SSL certificates
4. Your site will be live at https://mentaliststars.com 🎉

---

## ⚡ Part 2: Cloudflare Workers (Backend API)

### Step 1: Set Up Custom Domain for Backend API
1. Go to https://dash.cloudflare.com
2. Select your domain or add `mentaliststars.com` if not already added
3. Go to **"Workers & Pages"**
4. Click on your worker: `mentalist-stars-backend`
5. Go to **"Settings"** → **"Domains & Routes"**
6. Click **"Add Custom Domain"**
7. Enter: `api.mentaliststars.com`
8. Click **"Add Domain"**

### Step 2: Configure DNS (Automatic)
Cloudflare will automatically add the DNS record for you:
