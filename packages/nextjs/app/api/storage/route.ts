/**
 * Server-side Arweave storage uploader (Turbo SDK).
 *
 * The vault wizard POSTs the already-encrypted, Lit-sealed manifest here as raw
 * bytes; this route stores it on Arweave via Turbo and returns the transaction
 * id. No plaintext or key material ever reaches the route — the body is
 * AES-256-GCM ciphertext wrapped in a self-describing manifest.
 *
 * Hardening:
 * - Body capped at 100 KiB (Turbo's free tier ceiling; also an abuse cap).
 * - Best-effort in-memory rate limiting per client IP.
 * - Generic error messages; payloads are never logged.
 * - `Cache-Control: no-store` on every response.
 *
 * The free <100 KiB path uses `TurboFactory.unauthenticated()`, so NO secret or
 * funded wallet is required. The Turbo SDK is Node-oriented, so it is imported
 * dynamically and only ever runs in this `nodejs` runtime — never client-side.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 100 * 1024;

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

function safeDecode(value: string | null, max: number): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).slice(0, max);
  } catch {
    return value.slice(0, max);
  }
}

const noStore = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: noStore });
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength === 0) {
    return Response.json({ error: "Empty payload." }, { status: 400, headers: noStore });
  }
  if (body.byteLength > MAX_BYTES) {
    return Response.json({ error: "Payload too large (max 100 KiB)." }, { status: 413, headers: noStore });
  }

  const tags = [
    { name: "Content-Type", value: "application/octet-stream" },
    { name: "App-Name", value: "ZK-Whistle" },
    { name: "Encryption-Algorithm", value: "AES-256-GCM" },
  ];
  const version = safeDecode(request.headers.get("x-zkw-version"), 32);
  const fileName = safeDecode(request.headers.get("x-zkw-file-name"), 256);
  const mimeType = safeDecode(request.headers.get("x-zkw-mime-type"), 128);
  if (version) tags.push({ name: "App-Version", value: version });
  if (fileName) tags.push({ name: "File-Name", value: fileName });
  if (mimeType) tags.push({ name: "Original-Type", value: mimeType });

  try {
    const { TurboFactory } = await import("@ardrive/turbo-sdk");
    const turbo = TurboFactory.unauthenticated({ token: "base-usdc" });
    const { id } = await turbo.uploadRawX402Data({ data: Buffer.from(body), tags });
    return Response.json({ id }, { headers: noStore });
  } catch (error) {
    console.error("Storage upload failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Failed to store the encrypted payload." }, { status: 502, headers: noStore });
  }
}
