# PublishAll — One-Click Multi-Platform Content Publishing

Write your content once, and publish AI-adapted versions to **Medium, LinkedIn, Instagram, Dev.to, and WordPress** — all from one simple dashboard.

This is a standard, self-contained web application built on open technologies. It has **no lock-in to any single host or AI provider** and can be deployed anywhere that runs Node.js. Contributors can enhance it using any LLM, IDE, or AI coding agent.

---

## Tech Stack (all open-source / standard)

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) + React |
| Language | TypeScript |
| Styling | Tailwind CSS + Radix UI |
| Database | PostgreSQL via [Prisma ORM](https://www.prisma.io) |
| Auth | [Auth.js (NextAuth)](https://authjs.dev) — email/password |
| AI adaptation | Any **OpenAI-compatible** chat completions API (configurable) |

Because every dependency is standard, you are free to move this app to Vercel, Railway, Render, Fly.io, a Docker container, or your own server at any time.

---

## Quick Start (local development)

### 1. Prerequisites
- [Node.js](https://nodejs.org) 18+ and [Yarn](https://yarnpkg.com)
- A PostgreSQL database (local, or a free one from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app))

### 2. Install dependencies
```bash
yarn install
```

### 3. Configure environment
Copy the example file and fill in your values:
```bash
cp .env.example .env
```
See **Environment Variables** below for what each value means.

### 4. Set up the database
```bash
yarn prisma generate
yarn prisma db push       # creates the tables
yarn prisma db seed       # optional: creates an initial login account
```

### 5. Run it
```bash
yarn dev
```
Open http://localhost:3000

---

## Environment Variables

All configuration lives in `.env`. See `.env.example` for a copy-paste template.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname` |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption. Generate with `openssl rand -base64 32` |
| `AUTH_SECRET` | Yes | Same value as `NEXTAUTH_SECRET` (Auth.js v5 reads this name) |
| `NEXTAUTH_URL` | Prod only | The public URL of your deployment, e.g. `https://yourapp.com` |
| `LLM_BASE_URL` | Yes | Base URL of your OpenAI-compatible AI provider (see below) |
| `LLM_API_KEY` | Yes | API key for that provider |
| `LLM_MODEL` | Yes | Model name to use for content adaptation |

### Choosing your AI provider

The content-adaptation feature works with **any OpenAI-compatible API**. Just set the three `LLM_*` variables. Examples:

**OpenAI**
```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

**OpenRouter** (access to many models)
```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=anthropic/claude-3.5-sonnet
```

**Groq**
```env
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
```

**Local (Ollama)** — no API key or internet needed
```env
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.1
```

The AI call lives in a single file — `app/api/adapt/route.ts` — if you ever want to customize the prompts or switch to a non-OpenAI-style SDK.

---

## Connecting the publishing platforms

Each user enters their own platform credentials in the app's **Settings** page (stored in your database, used only server-side). Here is where each credential comes from:

| Platform | What you need | Where to get it |
|---|---|---|
| **Medium** | Integration Token | Medium → Settings → Security and apps → Integration tokens |
| **Dev.to** | API Key | Dev.to → Settings → Extensions → DEV API Keys |
| **WordPress** | Site URL + Username + Application Password | WP Admin → Users → Profile → Application Passwords |
| **LinkedIn** | Access Token + Person URN | [LinkedIn Developer Portal](https://developer.linkedin.com) app with `w_member_social` scope |
| **Instagram** | Facebook Page Access Token + IG Business Account ID | [Meta for Developers](https://developers.facebook.com) — requires an Instagram **Professional** account linked to a Facebook Page |

> **Note on Instagram & LinkedIn:** Both require creating a developer app on Meta / LinkedIn and going through their approval/scope process. This is a platform requirement, not a limitation of this app.

---

## Deploying to production

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for step-by-step guides for Vercel, Railway, Docker, and a generic Node server.

Minimum checklist:
1. Provision a PostgreSQL database.
2. Set all environment variables (including `NEXTAUTH_URL` = your public URL).
3. Run `yarn build` then `yarn start` (or let your host do it).
4. Run `yarn prisma db push` against the production database once.

---

## Project Structure

```
app/
  api/            # Server-side API routes (publishing, AI adapt, settings, auth)
  dashboard/      # Main app UI: publish editor, history, settings
  login, signup/  # Auth pages
lib/
  publishers/     # One module per platform (medium, linkedin, instagram, devto, wordpress)
  platforms.ts    # Platform definitions and credential field config
prisma/
  schema.prisma   # Database schema
scripts/
  seed.ts         # Optional initial-account seeder
```

To add a new platform: create a module in `lib/publishers/`, add it to `lib/platforms.ts`, and wire it into `app/api/publish/route.ts`.

---

## License

MIT — see [`LICENSE`](./LICENSE). You are free to use, modify, and distribute this software.
