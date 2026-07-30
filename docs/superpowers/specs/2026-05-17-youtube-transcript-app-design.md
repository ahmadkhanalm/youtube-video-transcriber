# YouTube Transcript App Design

## Goal

Build a modern one-page React web app that lets a signed-in user paste a single YouTube URL or video ID, generate a transcript through Apify, copy the transcript, and revisit saved history.

## Core Product Flow

The first screen is the actual app, not a marketing page. A user sees a bold paste field for one YouTube link or ID. If they paste while logged out, the app opens an auth panel that says the first generation is free but an account is required. After login, the same pasted value remains ready to submit.

When the user generates a transcript, React calls a Supabase Edge Function named `generate-transcript`. The Edge Function validates the Supabase user, checks daily credit eligibility, calls Apify actor `automation-lab/youtube-transcript` with one URL, stores the result in Supabase, and returns the normalized transcript.

## Architecture

React is deployed to Vercel as the frontend. Supabase owns auth, database, row-level security, and the Edge Function. Apify is called only from the Edge Function so the Apify token is never exposed in browser code.

Frontend environment variables use the public Vite prefix for Supabase only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-side Edge Function secrets are set in Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_TOKEN`
- `APIFY_ACTOR_ID`, default `automation-lab/youtube-transcript`

## Data Model

`profiles` stores account-level billing and offer metadata. `transcript_generations` stores one row per generation with the YouTube input, normalized video metadata, transcript text, segment JSON, status, and timestamps. Daily free credit enforcement uses successful generation rows for the current UTC day.

## UI Direction

The interface should feel energetic, polished, and social-native without looking like a generic dark neon AI product. The visual direction is editorial Gen Z: warm paper base, ink-black typography, coral and acid-lime accents, collage-like geometry, compact controls, and a dense but readable transcript workspace.

The app has:

- Top header with brand, auth state, account button, and a limited-time offer strip.
- Main generator area with paste input, language selector, generate button, and credit status.
- Result area with video metadata, thumbnail, full transcript, timestamp segment list, and copy actions.
- History rail for previous generations.
- Auth panel for email/password sign up and sign in.
- Account panel for daily credit, plan, and offer expiry.

## Error Handling

The app validates obvious non-YouTube input before calling Supabase. The Edge Function remains the source of truth and rejects unauthenticated calls, exhausted daily credits, empty input, Apify failures, and videos with no transcript. Errors are returned as concise messages that the UI can show inline.

## Testing And Verification

The frontend must build successfully with Vite. Pure helpers for YouTube input normalization and transcript normalization should be covered with unit tests. The Edge Function code should be written so its normalization helpers can be tested outside Supabase runtime.
