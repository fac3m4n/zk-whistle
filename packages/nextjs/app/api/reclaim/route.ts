import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { RECLAIM_PROVIDERS } from "~~/services/zk-whistle/reclaimProtocol";

/**
 * Server-side Reclaim Protocol session initializer.
 *
 * The Reclaim **app secret** must never reach the browser. This route is the
 * only place it is used: it calls `ReclaimProofRequest.init(appId, appSecret,
 * providerId)` server-side and returns the serialized request config. The client
 * rebuilds it with `ReclaimProofRequest.fromJsonString(...)` and runs the
 * verification session without ever seeing the secret.
 *
 * Hardening:
 * - `providerId` is validated against a server-side allow-list (no arbitrary IDs).
 * - Best-effort in-memory rate limiting per client IP.
 * - Generic error messages; the secret is never logged or returned.
 * - `Cache-Control: no-store` on every response.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROVIDER_IDS = new Set<string>(Object.values(RECLAIM_PROVIDERS));

// Best-effort, per-instance rate limit (resets on redeploy). For multi-instance
// production, back this with a shared store (Redis/Upstash).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

const noStore = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: noStore });
  }

  const appId = process.env.RECLAIM_APP_ID || process.env.NEXT_PUBLIC_RECLAIM_APP_ID;
  const appSecret = process.env.RECLAIM_APP_SECRET;
  if (!appId || !appSecret) {
    // Misconfiguration — do not echo any secret material.
    return Response.json({ error: "Verification is not configured on the server." }, { status: 503, headers: noStore });
  }

  let providerId: unknown;
  try {
    const body = await request.json();
    providerId = body?.providerId;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400, headers: noStore });
  }

  if (typeof providerId !== "string" || !ALLOWED_PROVIDER_IDS.has(providerId)) {
    return Response.json({ error: "Unknown verification provider." }, { status: 400, headers: noStore });
  }

  try {
    const reclaimProofRequest = await ReclaimProofRequest.init(appId, appSecret, providerId);
    // Serialized config is safe to hand to the client; it contains no secret.
    return Response.json({ reclaimRequest: reclaimProofRequest.toJsonString() }, { headers: noStore });
  } catch (error) {
    console.error("Reclaim init failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Failed to start verification session." }, { status: 502, headers: noStore });
  }
}
