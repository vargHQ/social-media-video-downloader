# video-downloader (`vdl`)

Download videos by link from **X, YouTube, Instagram, Facebook, TikTok, Threads, Reddit, Vimeo, LinkedIn, Pinterest, Twitch, VK, Rutube, Bilibili** and the other 1800+ sites [yt-dlp](https://github.com/yt-dlp/yt-dlp) supports. Optionally upload the result straight to varg and get an `https://s3.varg.ai/...` URL you can pass as `from_video` to any generation.

Built on Bun + yt-dlp. If yt-dlp isn't installed, `vdl` downloads the standalone build into `~/.cache/vdl` on first run. ffmpeg is recommended: without it, YouTube can't merge separate HD video and audio streams.

## Install

```bash
bun install
bun link            # makes `vdl` available globally (optional)
brew install ffmpeg # recommended
```

## Usage

```bash
vdl https://x.com/NASA/status/2107850292305818006
vdl https://youtu.be/jNQXAC9IVRw -q 720            # cap at 720p (smaller side, so vertical videos work too)
vdl https://www.tiktok.com/@user/video/123 -a      # audio only, mp3
vdl https://www.youtube.com/playlist?list=... -p   # whole playlist / carousel
vdl https://www.instagram.com/reel/abc/ -c chrome  # use your logged-in Chrome session
vdl <url1> <url2> <url3> -o ~/Videos               # several at once

vdl info <url>       # metadata as JSON, no download
vdl update           # update yt-dlp, do this when a site stops working
vdl sites            # platforms with first-class support
```

Files are saved as `downloads/<Site>/<title> [<id>].mp4`. On stdout `vdl` prints only the path of each file (or the varg URL with `-u`), so it composes in scripts. Progress and logs go to stderr. Add `--json` for structured output.

### Straight into varg

```bash
export VARG_API_KEY=varg_...      # or log in with the varg CLI (~/.varg/credentials)
vdl https://x.com/.../status/123 -u -q 1080
# → https://s3.varg.ai/files/<account>/<file>.mp4
```

The upload goes through `POST /v2/files` with a content hash, so uploading the same file again returns the existing URL. varg accepts files up to **200 MB**; use `-q 720` for long videos. `VARG_API_URL=https://stage-api.varg.ai/v2` targets staging.

### Library

```ts
import { download, getInfo, uploadToVarg } from "@vargai/video-downloader";

const [file] = await download("https://youtu.be/jNQXAC9IVRw", {
  maxHeight: 1080,
  onProgress: (p) => console.log(p.percent),
});
const { url } = await uploadToVarg(file.path);
```

## Logins (Instagram, Facebook, Threads, LinkedIn, Vimeo)

These sites often refuse anonymous downloads or rate-limit them. Pass `-c chrome` (or `firefox`, `safari`, `edge`, `brave`) to reuse the session from your browser, or pass `--cookies cookies.txt`. Cookies are read locally by yt-dlp and never leave your machine.

## Troubleshooting

- **"Unsupported URL" or extraction errors**: sites change their pages often. Run `vdl update`. If yt-dlp came from Homebrew, run `brew upgrade yt-dlp`.
- **Low quality on YouTube**: install ffmpeg.
- **Private or age-restricted video**: use `-c <browser>`.

## Env

| Var | Purpose |
|---|---|
| `VARG_API_KEY` | API key for `--upload` |
| `VARG_API_URL` | Default `https://api.varg.ai/v2` |
| `YTDLP_PATH` | Use a specific yt-dlp binary |
| `FFMPEG_PATH` | Use a specific ffmpeg binary |
| `VDL_CACHE_DIR` | Where the auto-installed yt-dlp lives (default `~/.cache/vdl`) |

Only download content you have the rights to use. Respect each platform's terms of service.
