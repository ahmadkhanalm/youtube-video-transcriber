import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

type JsonRecord = Record<string, unknown>;

type NormalizedTranscript = {
  video_id: string | null;
  video_url: string | null;
  title: string | null;
  channel_name: string | null;
  thumbnail_url: string | null;
  transcript: string;
  segments: JsonRecord[];
  raw_item: JsonRecord;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  const apifyActorId = Deno.env.get("APIFY_ACTOR_ID") || "automation-lab/youtube-transcript";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("Supabase Edge Function is missing required Supabase environment variables");
    return jsonResponse({ error: "Server configuration is incomplete" }, 500);
  }

  if (!apifyToken) {
    console.error("Supabase Edge Function is missing APIFY_TOKEN");
    return jsonResponse({ error: "Apify token is not configured. Add APIFY_TOKEN to Supabase Edge Function secrets." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return jsonResponse({ error: "Authentication is required" }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: authError } = await authClient.auth.getUser();

  if (authError || !userData.user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401);
  }

  let body: JsonRecord;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON" }, 400);
  }

  const input = validateSingleYouTubeInput(body.input);
  if (!input.ok) {
    return jsonResponse({ error: input.error }, 400);
  }

  const language = sanitizeLanguage(body.language);

  const user = userData.user;
  const profile = await getOrCreateProfile(serviceClient, user.id, user.email ?? null);

  if (profile.error) {
    return jsonResponse({ error: "Could not load profile" }, 500);
  }

  if (profile.data.plan !== "unlimited") {
    const credit = await hasSuccessfulGenerationToday(serviceClient, user.id);

    if (credit.error) {
      return jsonResponse({ error: "Could not check daily generation limit" }, 500);
    }

    if (credit.used) {
      return jsonResponse({ error: "Daily free transcript already used" }, 429);
    }
  }

  try {
    const rawItem = await runApifyTranscriptActor(apifyActorId, apifyToken, input.value, language);
    const transcript = normalizeApifyItem(rawItem);

    if (!transcript.transcript.trim()) {
      throw new Error("No transcript was found for this video");
    }

    const { data: generation, error: insertError } = await serviceClient
      .from("transcript_generations")
      .insert({
        user_id: user.id,
        input: input.value,
        language,
        status: "success",
        ...transcript,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Transcript generated but could not be saved");
    }

    return jsonResponse({ generation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcript generation failed";

    await serviceClient.from("transcript_generations").insert({
      user_id: user.id,
      input: input.value,
      language,
      status: "failure",
      error_message: message,
    });

    return jsonResponse({ error: message }, 502);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function validateSingleYouTubeInput(value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Input must be a YouTube link or video ID" };
  }

  const input = value.trim();

  if (!input) {
    return { ok: false, error: "Input cannot be empty" };
  }

  if (/\s/.test(input)) {
    return { ok: false, error: "Only one YouTube link or video ID is allowed" };
  }

  if (YOUTUBE_ID_PATTERN.test(input)) {
    return { ok: true, value: input };
  }

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();

    if (!ALLOWED_HOSTS.has(host)) {
      return { ok: false, error: "Input must be a YouTube link or video ID" };
    }

    const videoId = host.endsWith("youtu.be")
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("v") || url.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/)?.[2];

    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) {
      return { ok: false, error: "Could not find a valid YouTube video ID" };
    }

    return { ok: true, value: input };
  } catch {
    return { ok: false, error: "Input must be a YouTube link or video ID" };
  }
}

async function getOrCreateProfile(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  email: string | null,
): Promise<{ data: { plan: string }; error: null } | { data: null; error: unknown }> {
  const { data, error } = await serviceClient
    .from("profiles")
    .upsert({ id: userId, email }, { onConflict: "id" })
    .select("plan")
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return { data, error: null };
}

async function hasSuccessfulGenerationToday(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ used: boolean; error: unknown | null }> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { count, error } = await serviceClient
    .from("transcript_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  return { used: (count ?? 0) > 0, error };
}

async function runApifyTranscriptActor(
  actorId: string,
  token: string,
  input: string,
  language: string,
): Promise<JsonRecord> {
  const actorPath = encodeURIComponent(actorId.replace("/", "~"));
  const runUrl = new URL(`https://api.apify.com/v2/acts/${actorPath}/runs`);
  runUrl.searchParams.set("token", token);
  runUrl.searchParams.set("waitForFinish", "120");

  const runResponse = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: [input],
      language,
      includeAutoGenerated: true,
      mergeSegments: true,
    }),
  });

  const runPayload = await readJson(runResponse);

  if (!runResponse.ok) {
    throw new Error(readApifyError(runPayload) || "Apify run could not be started");
  }

  const run = asRecord(asRecord(runPayload).data);

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify run did not finish successfully: ${String(run.status || "UNKNOWN")}`);
  }

  const datasetId = typeof run.defaultDatasetId === "string" ? run.defaultDatasetId : null;
  if (!datasetId) {
    throw new Error("Apify did not return a dataset");
  }

  const itemsUrl = new URL(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items`);
  itemsUrl.searchParams.set("token", token);
  itemsUrl.searchParams.set("clean", "true");

  const itemsResponse = await fetch(itemsUrl);
  const itemsPayload = await readJson(itemsResponse);

  if (!itemsResponse.ok) {
    throw new Error(readApifyError(itemsPayload) || "Could not fetch Apify dataset items");
  }

  if (!Array.isArray(itemsPayload) || itemsPayload.length === 0) {
    throw new Error("Apify returned no transcript items");
  }

  return asRecord(itemsPayload[0]);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readApifyError(payload: unknown): string | null {
  const error = asRecord(asRecord(payload).error);
  return typeof error.message === "string" ? error.message : null;
}

function normalizeApifyItem(item: JsonRecord): NormalizedTranscript {
  const segments = normalizeSegments(firstArray(item, ["segments", "transcriptSegments", "captions", "subtitles"]));
  const transcript = firstString(item, ["fullText", "transcript", "text", "content", "captionsText"]) || segments
    .map((segment) => firstString(segment, ["text", "content", "caption"]))
    .filter(Boolean)
    .join(" ");

  return {
    video_id: firstString(item, ["videoId", "video_id", "id"]) || extractVideoId(firstString(item, ["url", "videoUrl", "video_url"])),
    video_url: firstString(item, ["url", "videoUrl", "video_url", "youtubeUrl"]),
    title: firstString(item, ["title", "videoTitle", "name"]),
    channel_name: firstString(item, ["channelName", "channel", "author", "uploader"]),
    thumbnail_url: firstString(item, ["thumbnailUrl", "thumbnail", "image"]),
    transcript,
    segments,
    raw_item: item,
  };
}

function normalizeSegments(value: unknown[]): JsonRecord[] {
  return value
    .map((segment) => asRecord(segment))
    .filter((segment) => Object.keys(segment).length > 0);
}

function firstArray(item: JsonRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(item[key])) {
      return item[key] as unknown[];
    }
  }

  return [];
}

function firstString(item: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function sanitizeLanguage(value: unknown): string {
  if (typeof value !== "string") {
    return "en";
  }

  const language = value.trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(language) ? language : "en";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function extractVideoId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const result = validateSingleYouTubeInput(value);
  if (!result.ok) {
    return null;
  }

  if (YOUTUBE_ID_PATTERN.test(result.value)) {
    return result.value;
  }

  const url = new URL(result.value);
  return url.hostname.endsWith("youtu.be")
    ? url.pathname.split("/").filter(Boolean)[0] ?? null
    : url.searchParams.get("v") || url.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/)?.[2] || null;
}
