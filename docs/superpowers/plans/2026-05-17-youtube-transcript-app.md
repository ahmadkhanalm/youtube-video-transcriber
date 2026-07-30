# YouTube Transcript App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Supabase + Apify single-link YouTube transcript generator with auth, credits, copyable results, and history.

**Architecture:** Vite React runs on Vercel and only uses Supabase public keys. A Supabase Edge Function calls Apify with server-side secrets, enforces one free successful generation per UTC day, stores transcript history, and returns normalized output.

**Tech Stack:** React, TypeScript, Vite, Supabase JS, Supabase Edge Functions, Apify API, Vitest, CSS.

---

## File Structure

- `package.json`: project scripts and dependencies.
- `index.html`, `src/main.tsx`, `src/App.tsx`: React app shell.
- `src/lib/youtube.ts`: YouTube input validation and normalization helpers.
- `src/lib/transcript.ts`: transcript result normalization helpers.
- `src/lib/supabase.ts`: Supabase browser client.
- `src/styles.css`: full responsive UI styling.
- `src/lib/*.test.ts`: unit coverage for helpers.
- `supabase/functions/generate-transcript/index.ts`: authenticated transcript Edge Function.
- `supabase/migrations/202605170001_initial_schema.sql`: database schema and RLS policies.
- `.env`, `.env.example`: local environment variable templates.
- `vercel.json`: Vercel SPA routing.

## Tasks

### Task 1: Scaffold Project

- [ ] Create Vite React TypeScript files and install dependencies.
- [ ] Add scripts for `dev`, `build`, `preview`, and `test`.
- [ ] Add `.gitignore`, `.env`, `.env.example`, and `vercel.json`.

### Task 2: Data And Edge Function

- [ ] Create Supabase SQL migration for `profiles` and `transcript_generations`.
- [ ] Create Edge Function that validates auth, checks credit use, calls Apify actor `automation-lab/youtube-transcript`, stores results, and returns JSON.
- [ ] Keep Apify secrets server-side only.

### Task 3: Frontend Behavior

- [ ] Build the one-page interface with auth panel, generator, result view, history rail, and account panel.
- [ ] Call Supabase Auth for sign up/sign in/sign out.
- [ ] Call `generate-transcript` through `supabase.functions.invoke`.
- [ ] Load and render user history from Supabase.

### Task 4: Design Polish

- [ ] Apply the Gen Z editorial aesthetic with warm base, ink type, coral and acid-lime accents.
- [ ] Ensure mobile and desktop layouts do not overlap.
- [ ] Add loading, error, empty, copied, and exhausted-credit states.

### Task 5: Verification

- [ ] Run unit tests.
- [ ] Run production build.
- [ ] Fix any TypeScript, test, or build failures.
