import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
const FPS = 30;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("file:///tmp/claude-0/reveal/site/index.html");
await p.evaluate(() => window.ready);
const dur = await p.evaluate(() => window.DURATION);
const n = Math.round(dur * FPS);
const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), "/tmp/claude-0/reveal/video.mp4"], { stdio: ["pipe", "inherit", "inherit"] });
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  await p.evaluate((t) => window.render(t), i / FPS);
  const buf = await p.screenshot({ type: "jpeg", quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await b.close();
console.log("done", n, "frames");
