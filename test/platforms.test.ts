import { describe, expect, test } from "bun:test";
import { buildArgs, formatSort, parseProgress } from "../src/download";
import { detectPlatform, parseUrl } from "../src/platforms";

describe("detectPlatform", () => {
  test.each([
    ["https://www.youtube.com/watch?v=jNQXAC9IVRw", "youtube"],
    ["https://youtu.be/jNQXAC9IVRw", "youtube"],
    ["https://m.youtube.com/shorts/abc", "youtube"],
    ["https://x.com/user/status/123", "x"],
    ["https://twitter.com/user/status/123", "x"],
    ["https://www.instagram.com/reel/abc/", "instagram"],
    ["https://fb.watch/abc/", "facebook"],
    ["https://www.facebook.com/watch/?v=1", "facebook"],
    ["https://vm.tiktok.com/abc/", "tiktok"],
    ["https://www.threads.net/@u/post/abc", "threads"],
    ["vimeo.com/76979871", "vimeo"],
    ["https://example.com/video.mp4", "generic"],
  ])("%s → %s", (url, id) => {
    expect(detectPlatform(url).id).toBe(id);
  });

  test("does not match lookalike hosts", () => {
    expect(detectPlatform("https://notyoutube.com/watch").id).toBe("generic");
  });
});

describe("parseUrl", () => {
  test("adds https when scheme is missing", () => {
    expect(parseUrl("youtu.be/abc").href).toBe("https://youtu.be/abc");
  });
  test("rejects non-http schemes", () => {
    expect(() => parseUrl("file:///etc/passwd")).toThrow();
  });
});

describe("yt-dlp args", () => {
  test("resolution cap goes first in the format sort", () => {
    expect(formatSort(720).split(",")[0]).toBe("res:720");
    expect(formatSort().split(",")[0]).toBe("res");
  });

  test("url is passed after -- so it can't be read as a flag", () => {
    const args = buildArgs("https://x.com/a/status/1");
    expect(args.slice(-2)).toEqual(["--", "https://x.com/a/status/1"]);
    expect(args).toContain("--no-playlist");
  });

  test("audio only", () => {
    const args = buildArgs("https://youtu.be/a", { audioOnly: true, playlist: true });
    expect(args).toContain("-x");
    expect(args).toContain("--yes-playlist");
  });

  test("parseProgress", () => {
    expect(parseProgress("VDL_PROGRESS  42.0%|  26.63MiB/s|00:03")).toEqual({
      percent: 42,
      speed: "26.63MiB/s",
      eta: "00:03",
    });
    expect(parseProgress("VDL_PROGRESS 100.0%|4.93MiB/s|NA")?.eta).toBeUndefined();
    expect(parseProgress("[download] something")).toBeUndefined();
  });
});
