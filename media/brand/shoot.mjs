import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const S = "/tmp/claude-0/-home-user-nearlife/e5892b42-fd4e-530a-850e-848412e82a13/scratchpad";
const b = await chromium.launch();
async function shot(mode, w, h, scale, out) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await p.goto(`file:///tmp/claude-0/brand/brand.html?mode=${mode}`);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  await p.close();
}
await shot("avatar", 1000, 1000, 1, `${S}/nearlife-x-avatar-1000.png`);
await shot("header", 1500, 500, 1, `${S}/nearlife-x-header-1500x500.png`);
await shot("header", 1500, 500, 2, `${S}/nearlife-x-header-3000x1000.png`);
await b.close();
