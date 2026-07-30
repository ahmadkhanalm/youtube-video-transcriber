# YouTube Video Transcriber

> **Fast, accurate, and interactive YouTube video transcript extraction tool built with React 19, TypeScript, Supabase, and Apify.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-purple?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Edge%20Functions-green?logo=supabase)](https://supabase.com/)

---

## Overview

**YouTube Video Transcriber** is a full-stack web application designed to fetch, parse, render, and manage video transcripts from YouTube URLs, Shorts, and video IDs.

It provides an interactive interface with real-time text searching, timestamp navigation, full text copying, user authentication via Supabase Auth, and serverless background transcript generation powered by Supabase Edge Functions and Apify.

Whether you're summarizing lectures, analyzing video content, creating AI training datasets, or researching topics, YouTube Video Transcriber offers a complete end-to-end solution.

---

## Features

- **Instant Transcript Extraction**: Accepts standard YouTube URLs (`youtube.com/watch?v=...`), short links (`youtu.be/...`), Shorts (`youtube.com/shorts/...`), embeds, or raw 11-character video IDs.
- **Timestamp Navigation**: Interactive segment breakdown with precise timestamps.
- **Real-Time Transcript Search**: Instantly filter captions by keywords and phrases.
- **One-Click Export & Copy**: Copy full transcripts or individual timestamped segments with a single click.
- **Supabase Authentication**: Built-in user sign up, sign in, and session management.
- **Daily Quotas & History**: User-based transcript generation history and quota enforcement via database policies.
- **Multi-Language Support**: Supports English, auto-detect, Spanish, French, German, and auto-generated captions.
- **Row-Level Security (RLS)**: Production-grade database migrations with strict RLS policies.
- **Modern Dark UI**: Fluid, responsive, glassmorphic layout built with custom CSS variables and Lucide React icons.

---

## Architecture & Tech Stack

```
YouTube Video Transcriber Architecture
├── Frontend (React 19 + TypeScript + Vite)
│   ├── Component UI & State Management (App.tsx)
│   ├── YouTube Input Parsing & Validation (src/lib/youtube.ts)
│   ├── Transcript Normalization & Helpers (src/lib/transcript.ts)
│   └── Supabase Client Setup (src/lib/supabase.ts)
│
├── Backend / Edge Functions (Supabase Edge Function + Deno)
│   └── generate-transcript Edge Function (apify.com scraper integration)
│
└── Database (Supabase Postgres)
    ├── User Profiles Schema (profiles)
    └── Transcript Generations History (transcript_generations)
```

### Stack Breakdown
- **Frontend Framework**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Dev Server**: [Vite](https://vitejs.dev/)
- **Icon Library**: [Lucide React](https://lucide.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/) (Auth, Postgres, Edge Functions)
- **Scraper / Scraping API**: [Apify](https://apify.com/) (`automation-lab/youtube-transcript` actor)
- **Unit Testing**: [Vitest](https://vitest.dev/)

---

## Quick Start

### 1. Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `pnpm` / `yarn`
- A [Supabase](https://supabase.com/) account & project
- An [Apify](https://apify.com/) API Token

### 2. Clone the Repository

```bash
git clone https://github.com/ahmadkhanalm/youtube-video-transcriber.git
cd youtube-video-transcriber
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

Fill in your Supabase connection parameters in `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Security Notice**: Never commit `.env` or API keys to git. All secret files are ignored by default in `.gitignore`.

---

## Database & Edge Function Setup

### Database Migrations

Apply the database schema to your Supabase project using the Supabase CLI or SQL Editor:

Execute the SQL files in `supabase/migrations/` in chronological order:
1. `20260516200558_initial_auth_transcript_schema.sql`
2. `20260516200626_lock_down_public_trigger_functions.sql`
3. `20260516201018_fix_set_updated_at_search_path.sql`

### Edge Function Configuration

Deploy the `generate-transcript` edge function:

```bash
supabase functions deploy generate-transcript --project-ref your-project-ref
```

Set the required API secrets in Supabase:

```bash
supabase secrets set APIFY_TOKEN=your-apify-token --project-ref your-project-ref
supabase secrets set APIFY_ACTOR_ID=automation-lab/youtube-transcript --project-ref your-project-ref
```

Alternatively, copy `supabase/functions/.env.example` to `supabase/functions/.env` and push secrets via CLI:

```bash
supabase secrets set --env-file supabase/functions/.env --project-ref your-project-ref
```

---

## Development & Testing

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Run Unit Tests

Execute the unit tests powered by Vitest:

```bash
npm test
```

### Build for Production

```bash
npm run build
```

This compiles TypeScript definitions (`tsc -b`) and generates optimized production assets in `dist/`.

---

## Project Structure

```
.
├── .env.example                       # Root environment variables template
├── .gitignore                          # Git ignore rules for secrets, builds, & cache
├── LICENSE                             # MIT Open Source License
├── README.md                           # Documentation & user guide
├── index.html                          # HTML entry point
├── package.json                        # Node dependencies and npm scripts
├── tsconfig.json                       # TypeScript configuration
├── vercel.json                         # Vercel deployment configuration
├── vite.config.ts                      # Vite build configuration
├── docs/                               # Architecture specs and project plans
│   └── superpowers/
│       ├── plans/                      # Detailed implementation plans
│       └── specs/                      # Feature specifications
├── src/
│   ├── App.tsx                         # Main Application & State logic
│   ├── main.tsx                        # React application DOM root
│   ├── styles.css                      # Modern dark design system styles
│   ├── vite-env.d.ts                   # Environment type declarations
│   └── lib/
│       ├── supabase.ts                 # Supabase client instantiation
│       ├── transcript.ts               # Transcript interfaces, normalizers & formatters
│       ├── transcript.test.ts          # Vitest test suite for transcripts
│       ├── youtube.ts                  # YouTube URL parsing and regex matching
│       └── youtube.test.ts             # Vitest test suite for YouTube parser
└── supabase/
    ├── functions/
    │   ├── .env.example                # Secrets template for Edge Functions
    │   └── generate-transcript/
    │       └── index.ts                # Serverless Edge Function (Deno + Apify API)
    └── migrations/                     # PostgreSQL database schema & migrations
```

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.

---

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [issues page](https://github.com/ahmadkhanalm/youtube-video-transcriber/issues).

---

<p align="center">Maintained by <a href="https://github.com/ahmadkhanalm">Ahmad Khan</a></p>
