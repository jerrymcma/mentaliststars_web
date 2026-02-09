# Deployment Guide

## Backend Deployment (Youware)

### Prerequisites
1. Enable Youbase in your Youware project settings
2. Get an OpenRouter API key from https://openrouter.ai/settings/keys

### Steps
1. **Set Environment Variable**
   - In Youware dashboard, go to your project settings
   - Add secret: `OPENROUTER_API_KEY` with your OpenRouter API key

2. **Deploy Backend Worker**
   ```bash
   cd backend
   npm install
   npm run deploy
   ```

3. **Get Worker URL**
   - Copy the deployed worker URL from Youware dashboard
   - It will look like: `https://your-project.youware.workers.dev`

## Frontend Configuration

### Option 1: Use Backend (Recommended)
1. Create `.env.local` file in project root:
   ```
   VITE_BACKEND_URL=https://your-project.youware.workers.dev
   ```

2. Build and deploy:
   ```bash
   npm run build
   # Deploy the dist/ folder to your hosting service
   ```

### Option 2: Client-Side Only
- No configuration needed
- Users provide their own OpenRouter API key via the settings UI
- API calls are made directly from the browser

## Local Development

1. **Backend** (optional):
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend**:
   ```bash
   npm install
   npm run dev
   ```

3. Create `.env.local`:
   ```
   VITE_BACKEND_URL=http://localhost:8787
   ```

## Environment Variables

### Backend
- `OPENROUTER_API_KEY` - Your OpenRouter API key (required)

### Frontend
- `VITE_BACKEND_URL` - Backend worker URL (optional, enables server-side API calls)

## Security Notes
- When using backend mode, API keys are stored server-side securely
- Client-side mode stores API keys in localStorage (less secure but more flexible)
- Always use HTTPS in production
