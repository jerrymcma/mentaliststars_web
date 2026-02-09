# Oz Pearlman — The Mentalist AI Chat Agent

## Overview
An interactive AI chat agent modeled after Oz Pearlman, the world's greatest mentalist. Features mind-reading games, psychological insights, cold reading demonstrations, and mentalism storytelling — all in a dark, mystical-themed interface.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **AI Provider**: OpenRouter API (supports browser-side CORS, user provides their own key)
- **Model**: openai/gpt-4o-mini via OpenRouter (temperature 0.9)
- **Fonts**: Playfair Display (headings), Inter (body)

## Architecture

### Frontend (`src/`)
- `App.tsx` — Root component, renders ChatPage
- `pages/ChatPage.tsx` — Full chat interface with welcome screen, settings modal, streaming messages
- `lib/ai.ts` — OpenRouter API integration with streaming, system prompt, and API key management
- `index.css` — Tailwind + custom CSS animations (nebula drift, pulse glow, shimmer, typing dots)

### Backend (`backend/src/index.ts`)
- Minimal health check endpoint (available for future extension)
- Backend can be extended with Youbase for server-side AI key management

## Design System
- **Color Palette**: Midnight (#0a0a0f), Deep Purple (#1a1025), Mystic Purple (#2d1b4e), Gold (#d4a853), Silver (#c0c0c8)
- **Theme**: Dark mystical aesthetic with gold accents, glass-morphism effects, animated nebula backgrounds
- **Avatar**: Oz Pearlman photo served from CDN

## User Setup
1. Click the ⚙️ settings icon in the header
2. Enter an OpenRouter API key (get one free at https://openrouter.ai/settings/keys)
3. Start chatting with the mentalist!

## Build
```bash
npm install && npm run build
```
