import { chmod, mkdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CACHE_DIR = process.env.VDL_CACHE_DIR ?? join(homedir(), ".cache", "vdl");
const RELEASES = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

function releaseAsset(): string {
  const { platform, arch } = process;
  if (platform === "darwin") return "yt-dlp_macos";
  if (platform === "win32") return "yt-dlp.exe";
  if (platform === "linux") return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
  throw new Error(`No yt-dlp build for ${platform}/${arch}; install yt-dlp and set YTDLP_PATH`);
}

/**
 * Resolve the yt-dlp binary: $YTDLP_PATH → yt-dlp on PATH → cached standalone
 * build in ~/.cache/vdl (downloaded from GitHub releases on first use).
 */
export async function resolveYtDlp(): Promise<string> {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const onPath = Bun.which("yt-dlp");
  if (onPath) return onPath;

  const target = join(CACHE_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  if (await Bun.file(target).exists()) return target;
  return installYtDlp(target);
}

async function installYtDlp(target: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const res = await fetch(`${RELEASES}/${releaseAsset()}`);
  if (!res.ok) throw new Error(`Failed to download yt-dlp: HTTP ${res.status}`);
  const tmp = `${target}.part`;
  await Bun.write(tmp, res);
  await chmod(tmp, 0o755);
  await rename(tmp, target);
  return target;
}

/** Update the cached/standalone yt-dlp (sites change often; stale builds break). */
export async function updateYtDlp(): Promise<string> {
  const bin = await resolveYtDlp();
  const proc = Bun.spawn([bin, "-U"], { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  await proc.exited;
  return (out + err).trim();
}

export function hasFfmpeg(): boolean {
  return Boolean(process.env.FFMPEG_PATH || Bun.which("ffmpeg"));
}

export type RunOptions = {
  onLine?: (line: string) => void;
  signal?: AbortSignal;
};

export class YtDlpError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "YtDlpError";
  }
}

/** Run yt-dlp, streaming stdout line by line. Resolves with all stdout lines. */
export async function runYtDlp(args: string[], opts: RunOptions = {}): Promise<string[]> {
  const bin = await resolveYtDlp();
  const ffmpeg = process.env.FFMPEG_PATH;
  const proc = Bun.spawn([bin, ...(ffmpeg ? ["--ffmpeg-location", ffmpeg] : []), ...args], {
    stdout: "pipe",
    stderr: "pipe",
    signal: opts.signal,
  });

  const lines: string[] = [];
  const stderrText = new Response(proc.stderr).text();
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of proc.stdout) {
    buf += decoder.decode(chunk, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl !== -1) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      lines.push(line);
      opts.onLine?.(line);
      nl = buf.indexOf("\n");
    }
  }
  if (buf) {
    lines.push(buf);
    opts.onLine?.(buf);
  }

  const code = await proc.exited;
  const stderr = await stderrText;
  if (code !== 0) {
    const reason = stderr.split("\n").filter((l) => l.startsWith("ERROR")).join("\n") || stderr.trim();
    throw new YtDlpError(reason || `yt-dlp exited with code ${code}`, code, stderr);
  }
  return lines;
}
