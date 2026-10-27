/**
 * Known platforms. yt-dlp supports 1800+ sites, so anything not listed here
 * still works as "generic" — this table only gives nicer names and lets us
 * apply per-platform hints (e.g. cookies for Instagram/Facebook).
 */
export type Platform = {
  id: string;
  name: string;
  hosts: string[];
  /** Platform often requires a logged-in session for downloads. */
  needsCookies?: boolean;
};

export const PLATFORMS: Platform[] = [
  { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"] },
  { id: "x", name: "X (Twitter)", hosts: ["x.com", "twitter.com", "fxtwitter.com", "vxtwitter.com"] },
  { id: "instagram", name: "Instagram", hosts: ["instagram.com", "instagr.am"], needsCookies: true },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.watch", "fb.com"], needsCookies: true },
  { id: "tiktok", name: "TikTok", hosts: ["tiktok.com"] },
  { id: "threads", name: "Threads", hosts: ["threads.net", "threads.com"], needsCookies: true },
  { id: "reddit", name: "Reddit", hosts: ["reddit.com", "redd.it"] },
  { id: "vimeo", name: "Vimeo", hosts: ["vimeo.com"], needsCookies: true },
  { id: "linkedin", name: "LinkedIn", hosts: ["linkedin.com"], needsCookies: true },
  { id: "pinterest", name: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
  { id: "snapchat", name: "Snapchat", hosts: ["snapchat.com"] },
  { id: "twitch", name: "Twitch", hosts: ["twitch.tv"] },
  { id: "kick", name: "Kick", hosts: ["kick.com"] },
  { id: "dailymotion", name: "Dailymotion", hosts: ["dailymotion.com", "dai.ly"] },
  { id: "bilibili", name: "Bilibili", hosts: ["bilibili.com", "b23.tv"] },
  { id: "vk", name: "VK Video", hosts: ["vk.com", "vkvideo.ru", "vk.ru"] },
  { id: "rutube", name: "Rutube", hosts: ["rutube.ru"] },
  { id: "ok", name: "OK.ru", hosts: ["ok.ru"] },
  { id: "bluesky", name: "Bluesky", hosts: ["bsky.app"] },
  { id: "tumblr", name: "Tumblr", hosts: ["tumblr.com"] },
  { id: "streamable", name: "Streamable", hosts: ["streamable.com"] },
  { id: "loom", name: "Loom", hosts: ["loom.com"] },
  { id: "soundcloud", name: "SoundCloud", hosts: ["soundcloud.com"] },
];

const GENERIC: Platform = { id: "generic", name: "Other", hosts: [] };

export function parseUrl(input: string): URL {
  const trimmed = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  return url;
}

export function detectPlatform(input: string | URL): Platform {
  const url = typeof input === "string" ? parseUrl(input) : input;
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\.|^mobile\./, "");
  return (
    PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? GENERIC
  );
}
