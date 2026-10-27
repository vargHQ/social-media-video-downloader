import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";

/** varg API limit for /v2/files uploads. */
export const VARG_MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export type VargConfig = {
  apiKey?: string;
  /** Default: $VARG_API_URL or https://api.varg.ai/v2 */
  baseUrl?: string;
  workspaceId?: string;
};

export type VargFile = {
  file_id: string;
  url: string;
  hash: string;
  size: number;
  media_type: string;
  filename?: string;
  metadata?: { width?: number; height?: number; duration_ms?: number } | null;
  deduplicated?: boolean;
};

const MEDIA_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** API key from $VARG_API_KEY, falling back to ~/.varg/credentials (same as the varg SDK). */
export async function resolveApiKey(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  if (process.env.VARG_API_KEY) return process.env.VARG_API_KEY;
  try {
    const creds = JSON.parse(await readFile(join(homedir(), ".varg", "credentials"), "utf8"));
    if (typeof creds.api_key === "string" && creds.api_key) return creds.api_key;
  } catch {}
  throw new Error("No varg API key: set VARG_API_KEY (get one at https://app.varg.ai)");
}

/**
 * Upload a local file to varg (`POST /v2/files`, streamed raw body).
 * The returned `url` (https://s3.varg.ai/...) can be passed as `from_video` /
 * `files[]` to any varg generation.
 */
export async function uploadToVarg(path: string, config: VargConfig = {}): Promise<VargFile> {
  const file = Bun.file(path);
  if (file.size > VARG_MAX_UPLOAD_BYTES) {
    throw new Error(
      `${basename(path)} is ${(file.size / 1024 / 1024).toFixed(0)} MB; varg accepts up to 200 MB (try --max-height 720)`,
    );
  }

  const apiKey = await resolveApiKey(config.apiKey);
  const baseUrl = (config.baseUrl ?? process.env.VARG_API_URL ?? "https://api.varg.ai/v2").replace(/\/$/, "");
  const hash = new Bun.CryptoHasher("sha256").update(await file.arrayBuffer()).digest("hex");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": MEDIA_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream",
    "X-Filename": encodeURIComponent(basename(path)),
    "X-Content-Hash": `sha256:${hash}`,
  };
  if (config.workspaceId) headers["X-Workspace-Id"] = config.workspaceId;

  const res = await fetch(`${baseUrl}/files`, { method: "POST", headers, body: file });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.error?.message ?? parsed.error?.code ?? body;
    } catch {}
    throw new Error(`varg upload failed (HTTP ${res.status}): ${message}`);
  }
  return (await res.json()) as VargFile;
}
