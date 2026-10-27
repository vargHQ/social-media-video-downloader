# video-downloader

`vdl`: a Bun CLI and library that downloads videos by URL (via yt-dlp) and can upload them to varg (`POST /v2/files`).

- `src/ytdlp.ts` finds yt-dlp ($YTDLP_PATH → PATH → auto-install into ~/.cache/vdl) and runs it, streaming stdout lines.
- `src/download.ts` builds yt-dlp args. Progress and results come back as marker lines (`VDL_PROGRESS`, `VDL_DONE <json>`) produced by `--progress-template` and `--print after_move:`. Keep those markers in sync with `parseProgress` and the `DONE` handler.
- `src/varg.ts` handles upload to varg: raw body, `X-Content-Hash` for dedup, 200 MB limit. The key comes from VARG_API_KEY or `~/.varg/credentials` (`api_key`, same as the sdk).
- `src/platforms.ts` is only for display names and cookie hints. Any URL works, because yt-dlp decides.
- Format choice uses `-S res:N` (the smaller side), not a `height<=N` filter, so vertical videos aren't downgraded.

Commands: `bun test`, `bun run typecheck`, `bun src/cli.ts <url>`.
Never commit downloaded media (`downloads/` is gitignored).
