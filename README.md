# Social Media Video Downloader: X (Twitter), YouTube, Instagram, TikTok, Facebook

**Download videos from X/Twitter, YouTube, Instagram Reels, TikTok, Facebook, Reddit, Vimeo, Threads, Pinterest, Twitch, VK, Bilibili and 1800+ other sites with one command.** A fast, open-source CLI and TypeScript library built on [yt-dlp](https://github.com/yt-dlp/yt-dlp) and Bun. It saves MP4 (h264 + aac) that plays everywhere, or MP3 audio, at the resolution you pick, including whole playlists. It also works as a skill for AI agents (Claude Code, Cursor, OpenCode).

```bash
vdl https://x.com/NASA/status/2112560723603632217
# → downloads/Twitter/NASA - There's a lot of ground to cover ... [2112560648005484545].mp4
```

- **One tool for every platform**: paste any video link (tweet, Short, Reel, TikTok, Facebook video, Reddit post, playlist).
- **Files that just work**: MP4 with h264 video and AAC audio, ready for editing, upload or a video model.
- **Quality control**: `-q 1080`, `-q 720`, `-q 480`. Resolution is measured on the smaller side, so vertical Reels, Shorts and TikToks stay 720×1280.
- **Audio only**: `-a` extracts MP3 from any video (podcasts, music, voice).
- **Playlists and carousels**: `-p` downloads every item.
- **Private and login-only videos**: `-c chrome` reuses your own browser session. Cookies never leave your machine.
- **Zero setup**: if yt-dlp isn't installed, `vdl` downloads the official standalone build on first run.
- **Scriptable**: stdout carries only file paths, logs go to stderr, and `--json` gives structured output.

## Supported sites

| Platform | Examples of links | Notes |
|---|---|---|
| **X / Twitter** | `x.com/<user>/status/<id>`, `twitter.com/...` | Videos and GIFs |
| **YouTube** | videos, Shorts, playlists, `youtu.be/...` | Install ffmpeg for 1080p+ |
| **Instagram** | Reels, posts, carousels | Some posts need `-c <browser>` |
| **TikTok** | `tiktok.com/@user/video/<id>`, `vm.tiktok.com/...` | |
| **Facebook** | videos, Reels, `fb.watch/...` | Usually needs `-c <browser>` |
| **Reddit** | `v.redd.it` video posts | Needs `-c <browser>` |
| **Threads, LinkedIn, Vimeo** | post and video links | Usually needs `-c <browser>` |
| **Pinterest, Snapchat, Bluesky, Tumblr** | pin and post links | |
| **Twitch, Kick** | clips and VODs | |
| **VK Video, Rutube, OK.ru, Bilibili, Dailymotion, Loom, Streamable, SoundCloud** | video and track links | |
| **…and 1800+ more** | [full list](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) | Anything yt-dlp supports |

## Install

Requires [Bun](https://bun.sh). [ffmpeg](https://ffmpeg.org) is recommended for HD YouTube and MP3.

```bash
git clone https://github.com/vargHQ/social-media-video-downloader.git
cd social-media-video-downloader
bun install
bun link        # puts `vdl` on your PATH
brew install ffmpeg
```

## Usage

### Download a Twitter / X video

```bash
vdl https://x.com/<user>/status/<id>
```

### Download a YouTube video, Short or playlist

```bash
vdl https://www.youtube.com/watch?v=jNQXAC9IVRw -q 1080
vdl "https://www.youtube.com/playlist?list=<id>" -p -o ~/Videos
```

### Download Instagram Reels and posts

```bash
vdl https://www.instagram.com/reel/<id>/
vdl https://www.instagram.com/p/<id>/ -c chrome      # if Instagram asks for a login
```

### Download TikTok videos

```bash
vdl https://www.tiktok.com/@<user>/video/<id> -q 720
```

### Download Facebook and Reddit videos

```bash
vdl https://www.facebook.com/<page>/videos/<id>/ -c chrome
vdl https://www.reddit.com/r/<sub>/comments/<id>/ -c firefox
```

### Extract audio as MP3

```bash
vdl https://youtu.be/<id> -a
```

### Several links, metadata, updates

```bash
vdl <url1> <url2> <url3> -o ~/Downloads
vdl info <url>      # title, author, duration, resolution as JSON; nothing is downloaded
vdl update          # update yt-dlp when a site changes
vdl sites           # platforms with first-class support
```

### All options

```
-o, --out <dir>              output directory (default: ./downloads)
-q, --max-height <px>        cap resolution: 1080, 720… (smaller side, works for vertical)
-a, --audio                  audio only (mp3)
-p, --playlist               download every item of a playlist/carousel
-c, --cookies-browser <name> use logged-in cookies from chrome|firefox|safari|edge|brave
    --cookies <file>         cookies.txt (Netscape format)
    --max-size <size>        skip files larger than this, e.g. 500M
-u, --upload                 upload to varg after download (optional, see below)
    --json                   machine-readable output
```

Files are saved as `downloads/<Site>/<title> [<id>].mp4`.

## Use as a TypeScript library

```ts
import { download, getInfo } from "@vargai/video-downloader";

const info = await getInfo("https://youtu.be/jNQXAC9IVRw");
const [file] = await download("https://x.com/NASA/status/2112560723603632217", {
  maxHeight: 720,
  outDir: "videos",
  onProgress: (p) => console.log(`${p.percent}%`),
});
console.log(file.path, file.width, file.height, file.duration);
```

## Use with AI agents (Claude Code, Cursor, OpenCode)

The [`media-download`](https://github.com/vargHQ/skills/tree/main/media-download) agent skill wraps the same flags. With it, an agent downloads any pasted link when you say "download this video", and pulls Pinterest images for moodboards. It needs no API key.

```bash
claude plugin marketplace add vargHQ/skills
claude plugin install varg@varg
```

## Optional: send downloads straight to varg

[varg](https://varg.ai) is an AI video platform. With `-u`, `vdl` uploads the file to your varg storage and prints an `https://s3.varg.ai/...` URL that you can use as a video-to-video or lip-sync input:

```bash
export VARG_API_KEY=varg_...
vdl https://www.tiktok.com/@<user>/video/<id> -u -q 1080
```

This is entirely optional. Without `-u`, nothing leaves your machine.

## FAQ

**Is it free?** Yes. It's MIT-licensed, has no ads and needs no account.

**Why does Instagram or Facebook fail?** Those sites often block anonymous downloads. Log in through your browser, then add `-c chrome` (or `safari`, `firefox`, `edge`, `brave`).

**A site stopped working.** Sites change their pages often. Run `vdl update` (or `brew upgrade yt-dlp`) and try again.

**Why is my YouTube download low quality?** Install ffmpeg. HD YouTube streams arrive as separate video and audio and have to be merged.

**Does it work on Windows / Linux?** macOS and Linux are tested. Windows works through Bun with a yt-dlp.exe on PATH.

## Environment variables

| Var | Purpose |
|---|---|
| `YTDLP_PATH` | Use a specific yt-dlp binary |
| `FFMPEG_PATH` | Use a specific ffmpeg binary |
| `VDL_CACHE_DIR` | Where the auto-installed yt-dlp lives (default `~/.cache/vdl`) |
| `VARG_API_KEY`, `VARG_API_URL` | Only for the optional `--upload` |

## Legal

Download only content you own or have permission to use, and follow each platform's terms of service. This project doesn't bypass DRM or paywalls.

## License

[MIT](LICENSE) © varg
