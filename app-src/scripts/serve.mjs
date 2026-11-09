/* Serves dist/ at http://localhost:<port>/woodstock/ the way GitHub Pages does (404.html fallback). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", process.env.DIST || "dist");
const port = Number(process.env.PORT || 8088), BASE = "/woodstock/";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".mp4": "video/mp4", ".ico": "image/x-icon" };
export function start(p = port) {
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || "/").split("?")[0]);
    if (u === "/woodstock") { res.writeHead(301, { Location: BASE }); return res.end(); }
    if (!u.startsWith(BASE)) { res.writeHead(404); return res.end("not under " + BASE); }
    let f = path.join(root, u.slice(BASE.length));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    let status = 200;
    if (!fs.existsSync(f)) { f = path.join(root, "404.html"); status = 404; }
    res.writeHead(status, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(p, () => r(srv)));
}
if (process.argv[1] && process.argv[1].endsWith("serve.mjs")) start().then(() => console.log(`http://localhost:${port}${BASE}`));
