# All Hub - AI Content Creation Platform

## Project Overview
An AI-powered content creation platform designed for the Nigerian market. Uses Google's Gemini AI to help users generate professional articles for Opera News Hub and comprehensive eBook manuscripts.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Lucide React, Motion
- **Backend**: Node.js + Express (serves as Vite middleware proxy in dev)
- **AI**: Google Generative AI (`@google/genai`) - Gemini models
- **Auth/DB**: Firebase (Firestore + Firebase Auth) + localStorage guest mode
- **Mobile**: Capacitor (Android)
- **Build**: Vite 6, tsx

## Features
1. **Opera Hub**: Generates mobile-friendly news articles with category-specific perspectives
2. **Pro E-book**: Book Architect for structured manuscript generation with TOC and chapters

## Project Structure
- `src/` - React frontend
  - `components/` - OperaWriter.tsx, EbookWriter.tsx
  - `pages/` - Dashboard.tsx, Login.tsx
  - `services/` - geminiService.ts, firebase.ts
- `backend/services/aiService.ts` - Server-side Gemini logic
- `server.ts` - Express entry point (port 5000)
- `vite.config.ts` - Vite config with host/allowedHosts for Replit proxy
- `android/` - Capacitor Android project

## Development
- Run: `npm run dev` (starts on port 5000)
- Build: `npm run build`
- Package manager: npm

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key (required for AI features)
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Environment mode
- `VITE_BACKEND_URL` - Backend URL for production/Android builds

## Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `node --loader tsx/esm server.ts`
