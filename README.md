# Steam Profile Studio

Paste a Steam profile and preview it with different Steam Points Shop items (backgrounds, avatar frames, animated avatars, profile themes) or your own artwork, with links to buy each item. See `CLAUDE.md` for the plan and decisions.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then put your Steam Web API key in .env.local
npm run dev                  # http://localhost:3000
```

`STEAM_API_KEY` is read only in server code. Never give it a `NEXT_PUBLIC_` prefix. `.env.local` is gitignored.

## Scripts

- `npm run dev`: development server
- `npm run build`: production build
- `npm run start`: serve the production build
- `npm run lint`: ESLint

## Stack

Next.js (App Router) and TypeScript, styled with CSS Modules, deployed on Vercel.
