/*
 * Serves an exported web build under /woodstock/ with `python3 -m http.server`, the way the founder's
 * GitHub Pages site serves it (same subpath). A temporary root holds one symlink, woodstock -> <dist>.
 * python's server has no 404.html fallback, so deep links are not tested here; tests always enter at
 * /woodstock/ (tests/smoke.mjs covers the deep-link fallback with scripts/serve.mjs).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const BASE = "/woodstock/";

export async function servePython(dist, port) {
  if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error(`no web build at ${dist} (run npm run build:web)`);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ws-e2e-root-"));
  fs.symlinkSync(path.resolve(dist), path.join(root, "woodstock"));
  const proc = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", root], { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  proc.stderr.on("data", (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
  const url = `http://127.0.0.1:${port}${BASE}`;
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(url); if (r.ok) return { url, close: () => { proc.kill(); fs.rmSync(root, { recursive: true, force: true }); } }; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  proc.kill();
  throw new Error("python3 -m http.server did not start: " + err.slice(-400));
}
