# Shelby Gets Organized

A mobile-first PWA for tracking personal resale inventory. Built with React + Vite + Tailwind CSS.

## Features
- Track items with purchase price, target sell price, and sold price
- Auto-calculate USD equivalent and profit
- Photo upload per item
- Voice input with AI extraction (Anthropic Claude API)
- Dashboard with stats and profit chart
- Fully offline-capable PWA (installable on mobile)

## Setup

1. Clone and install:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and add your Anthropic API key:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and set VITE_ANTHROPIC_API_KEY
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo.
3. Framework: **Vite** (auto-detected).
4. Add environment variable: `VITE_ANTHROPIC_API_KEY` = your key.
5. Click **Deploy**.

To install as a PWA on mobile: open the deployed URL in Safari (iOS) or Chrome (Android), then use "Add to Home Screen".

## Build

```bash
npm run build
npm run preview
```
