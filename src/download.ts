import { resolve } from "node:path";
import { detectPlatform, parseUrl, type Platform } from "./platforms";
import { hasFfmpeg, runYtDlp } from "./ytdlp";

export type DownloadOptions = {
  /** Directory to save into. Default: ./downloads */
  outDir?: string;
  /** Cap resolution by the smaller side (720 = 720p, also for vertical video). Default: best available. */
  maxHeight?: number;
  /** Extract audio only (mp3). */
  audioOnly?: boolean;
  /** Download every item when the URL is a playlist/carousel. Default: false. */
  playlist?: boolean;
  /** Read cookies from a local browser (chrome, firefox, safari, edge, brave...). */
  cookiesFromBrowser?: string;
  /** Netscape-format cookies.txt file. */
  cookiesFile?: string;
  /** Abort if the file is larger than this, yt-dlp syntax ("500M", "2G"). */
  maxFilesize?: string;
  /** Raw extra yt-dlp arguments, appended last. */
  extraArgs?: string[];
  onProgress?: (p: Progress) => void;
  signal?: AbortSignal;
};

export type Progress = { percent: number; speed?: string; eta?: string };

export type VideoInfo = {
  id: string;
  title: string;
  uploader?: string;
  duration?: number;
  webpageUrl: string;
  extractor: string;
  width?: number;
  height?: number;
  ext: string;
  thumbnail?: string;
};

export type DownloadedFile = VideoInfo & { path: string; platform: Platform };

const PROGRESS = "VDL_PROGRESS ";
const DONE = "VDL_DONE ";
const FIELDS = "id,title,uploader,duration,webpage_url,extractor_key,width,height,ext,filepath,thumbnail";

/**
 * yt-dlp format sort. `res` is the *smaller* dimension, so `res:720` means 720p
 * for vertical videos too (a height filter would drop 720x1280). After
 * resolution, prefer h264 + m4a in mp4 so files play everywhere and work as varg inputs.
 */
export function formatSort(maxHeight?: number): string {
  return [maxHeight ? `res:${maxHeight}` : "res", "vcodec:h264", "acodec:m4a", "ext:mp4:m4a"].join(",");
}

export function buildArgs(url: string, opts: DownloadOptions = {}): string[] {
  const outDir = resolve(opts.outDir ?? "downloads");
  const args = [
    "--no-simulate",
    "--newline",
    "--progress",
    "--progress-template",
    `download:${PROGRESS}%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s`,
    "--print",
    `after_move:${DONE}%(.{${FIELDS}})j`,
    "-P",
    outDir,
    "-o",
    "%(extractor_key)s/%(title).80B [%(id)s].%(ext)s",
    "--no-mtime",
    opts.playlist ? "--yes-playlist" : "--no-playlist",
  ];

  if (opts.audioOnly) {
    args.push("-f", "ba/b", "-x", "--audio-format", "mp3");
  } else {
    args.push("-f", "bv*+ba/b", "-S", formatSort(opts.maxHeight));
    if (hasFfmpeg()) args.push("--merge-output-format", "mp4");
  }
  if (opts.cookiesFromBrowser) args.push("--cookies-from-browser", opts.cookiesFromBrowser);
  if (opts.cookiesFile) args.push("--cookies", opts.cookiesFile);
  if (opts.maxFilesize) args.push("--max-filesize", opts.maxFilesize);
  if (opts.extraArgs) args.push(...opts.extraArgs);
  args.push("--", url);
  return args;
}

export function parseProgress(line: string): Progress | undefined {
  if (!line.startsWith(PROGRESS)) return undefined;
  const [pct, speed, eta] = line.slice(PROGRESS.length).split("|").map((s) => s.trim());
  const percent = Number.parseFloat(pct ?? "");
  if (Number.isNaN(percent)) return undefined;
  const clean = (s?: string) => (s && s !== "NA" && s !== "Unknown" ? s : undefined);
  return { percent, speed: clean(speed), eta: clean(eta) };
}

type RawInfo = {
  id: string;
  title: string;
  uploader?: string | null;
  duration?: number | null;
  webpage_url: string;
  extractor_key: string;
  width?: number | null;
  height?: number | null;
  ext: string;
  filepath?: string;
  thumbnail?: string | null;
};

function toInfo(raw: RawInfo): VideoInfo {
  return {
    id: raw.id,
    title: raw.title,
    uploader: raw.uploader ?? undefined,
    duration: raw.duration ?? undefined,
    webpageUrl: raw.webpage_url,
    extractor: raw.extractor_key,
    width: raw.width ?? undefined,
    height: raw.height ?? undefined,
    ext: raw.ext,
    thumbnail: raw.thumbnail ?? undefined,
  };
}

/** Download a video (or every item of a playlist when `playlist: true`). */
export async function download(input: string, opts: DownloadOptions = {}): Promise<DownloadedFile[]> {
  const url = parseUrl(input);
  const platform = detectPlatform(url);
  const files: DownloadedFile[] = [];

  await runYtDlp(buildArgs(url.href, opts), {
    signal: opts.signal,
    onLine: (line) => {
      const progress = parseProgress(line);
      if (progress) return opts.onProgress?.(progress);
      if (line.startsWith(DONE)) {
        const raw = JSON.parse(line.slice(DONE.length)) as RawInfo;
        if (raw.filepath) files.push({ ...toInfo(raw), path: raw.filepath, platform });
      }
    },
  });

  if (files.length === 0) throw new Error(`No media downloaded from ${url.href}`);
  return files;
}

/** Fetch metadata without downloading. */
export async function getInfo(input: string, opts: Pick<DownloadOptions, "cookiesFromBrowser" | "cookiesFile" | "signal"> = {}) {
  const url = parseUrl(input);
  const args = ["--no-playlist", "-J"];
  if (opts.cookiesFromBrowser) args.push("--cookies-from-browser", opts.cookiesFromBrowser);
  if (opts.cookiesFile) args.push("--cookies", opts.cookiesFile);
  args.push("--", url.href);
  const lines = await runYtDlp(args, { signal: opts.signal });
  const raw = JSON.parse(lines.join("\n")) as RawInfo;
  return { ...toInfo(raw), platform: detectPlatform(url) };
}
