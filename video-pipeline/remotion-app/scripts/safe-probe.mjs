// Render stills of the SafeProbe composition at given frames and collect the DOM text boxes it logs.
// Usage: node scripts/safe-probe.mjs --props <props.json> --frames 18,120,... --out <dir>   (driven by tools/check_safe_zones.py)
// Writes <out>/probe.json = {frames: {"<f>": [rects]}, stills: {"<f>": png}}. Bundles once, one browser, existing deps only.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const propsPath = arg("--props");
const frames = String(arg("--frames", "0")).split(",").map(Number).filter((n) => Number.isFinite(n));
const outDir = path.resolve(arg("--out", "."));
fs.mkdirSync(outDir, { recursive: true });
const inputProps = JSON.parse(fs.readFileSync(propsPath, "utf8"));

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(app, "src/index.ts"), publicDir: path.join(app, "public"), enableCaching: true });
const browser = await openBrowser("chrome");
const composition = await selectComposition({ serveUrl, id: "SafeProbe", inputProps, puppeteerInstance: browser });
const result = { frames: {}, stills: {}, bundle_ms: Date.now() - t0 };
for (const f of frames) {
  const frame = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(f)));
  const output = path.join(outDir, `f${String(frame).padStart(5, "0")}.png`);
  await renderStill({
    serveUrl, composition, inputProps, frame, output, puppeteerInstance: browser, imageFormat: "png",
    onBrowserLog: (log) => {
      if (!log.text.startsWith("SAFEPROBE ")) return;
      const m = JSON.parse(log.text.slice(10));
      result.frames[String(m.frame)] = m.rects;
    },
  });
  result.stills[String(frame)] = output;
}
await browser.close({ silent: true });
result.total_ms = Date.now() - t0;
fs.writeFileSync(path.join(outDir, "probe.json"), JSON.stringify(result));
console.log(`safe-probe: ${frames.length} frame(s) in ${result.total_ms} ms (bundle ${result.bundle_ms} ms)`);
