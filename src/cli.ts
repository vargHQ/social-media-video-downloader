#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { download, getInfo } from "./download";
import { detectPlatform, PLATFORMS } from "./platforms";
import { resolveApiKey, uploadToVarg } from "./varg";
import { hasFfmpeg, updateYtDlp } from "./ytdlp";

const HELP = `vdl — social media video downloader: X, YouTube, Instagram, TikTok, Facebook and 1800+ sites

Usage:
  vdl <url...> [options]       download (and optionally upload to varg)
  vdl info <url>               print metadata as JSON, no download
  vdl update                   update yt-dlp (do this when a site stops working)
  vdl sites                    list platforms with first-class support

Options:
  -o, --out <dir>              output directory (default: ./downloads)
  -q, --max-height <px>        cap resolution: 1080, 720… (smaller side, works for vertical)
  -a, --audio                  audio only (mp3)
  -p, --playlist               download every item of a playlist/carousel
  -c, --cookies-browser <name> use logged-in cookies from chrome|firefox|safari|edge|brave
      --cookies <file>         cookies.txt (Netscape format)
      --max-size <size>        skip files larger than this, e.g. 500M
  -u, --upload                 upload to varg after download, print the s3.varg.ai URL
      --workspace <id>         varg workspace for the upload
      --json                   machine-readable output
  -h, --help

Env: VARG_API_KEY (for --upload), VARG_API_URL, YTDLP_PATH, FFMPEG_PATH`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", short: "o" },
    "max-height": { type: "string", short: "q" },
    audio: { type: "boolean", short: "a" },
    playlist: { type: "boolean", short: "p" },
    "cookies-browser": { type: "string", short: "c" },
    cookies: { type: "string" },
    "max-size": { type: "string" },
    upload: { type: "boolean", short: "u" },
    workspace: { type: "string" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

const json = Boolean(values.json);
const log = (msg: string) => {
  if (!json) process.stderr.write(`${msg}\n`);
};

async function main() {
  const [command, ...rest] = positionals;
  if (values.help || !command) return console.log(HELP);

  if (command === "update") return console.log(await updateYtDlp());
  if (command === "sites") {
    for (const p of PLATFORMS) console.log(`${p.name.padEnd(14)} ${p.hosts.join(", ")}`);
    return console.log("\n…plus every site yt-dlp supports: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md");
  }

  const cookies = { cookiesFromBrowser: values["cookies-browser"], cookiesFile: values.cookies };
  if (command === "info") {
    if (!rest[0]) throw new Error("Usage: vdl info <url>");
    return console.log(JSON.stringify(await getInfo(rest[0], cookies), null, 2));
  }

  if (!hasFfmpeg() && !values.audio) {
    log("warning: ffmpeg not found — high-quality YouTube streams can't be merged; falling back to single-file formats");
  }

  // Fail before downloading anything if the upload can't happen.
  const apiKey = values.upload ? await resolveApiKey() : undefined;

  const maxHeight = values["max-height"] ? Number.parseInt(values["max-height"], 10) : undefined;
  const results = [];
  let failed = 0;

  for (const url of positionals) {
    let platform;
    try {
      platform = detectPlatform(url);
    } catch {
      failed++;
      log(`✗ not a valid URL: ${url}`);
      results.push({ url, error: "invalid url" });
      continue;
    }
    log(`↓ ${platform.name}: ${url}`);
    try {
      const files = await download(url, {
        outDir: values.out,
        maxHeight,
        audioOnly: values.audio,
        playlist: values.playlist,
        maxFilesize: values["max-size"],
        ...cookies,
        onProgress: (p) => {
          if (json || !process.stderr.isTTY) return;
          const extra = [p.speed, p.eta && `ETA ${p.eta}`].filter(Boolean).join("  ");
          process.stderr.write(`\r  ${p.percent.toFixed(1).padStart(5)}%  ${extra}`.padEnd(48));
        },
      });
      if (!json && process.stderr.isTTY) process.stderr.write("\r".padEnd(49) + "\r");

      for (const file of files) {
        log(`✓ ${file.path}`);
        let varg;
        if (values.upload) {
          log("↑ uploading to varg…");
          varg = await uploadToVarg(file.path, { apiKey, workspaceId: values.workspace });
          log(`✓ ${varg.url}${varg.deduplicated ? " (already uploaded)" : ""}`);
          if (!json) console.log(varg.url);
        } else if (!json) {
          console.log(file.path);
        }
        results.push({ ...file, varg });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      log(`✗ ${message}`);
      if (platform.needsCookies && !cookies.cookiesFromBrowser && !cookies.cookiesFile) {
        log(`  hint: ${platform.name} often needs a login — retry with --cookies-browser chrome`);
      }
      results.push({ url, error: message });
    }
  }

  if (json) console.log(JSON.stringify(results, null, 2));
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
