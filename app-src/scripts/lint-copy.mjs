/*
 * Copy lint (mobile-lead), part of every stage gate. Scans app/, src/ and packages/engine/src for:
 *  - em or en dashes anywhere in source (founder rule: none in visible text; simplest to ban outright)
 *  - protected or banned titles and phrases (Compliance B1, B2, B4; Ontario title protection)
 *  - bracketed placeholders in content files (PM-R63)
 * Exit 1 on any hit. Add an exception only with a Compliance entry, in ALLOW below.
 */
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dirs = ["app", "src", "packages/engine/src"];
const RULES = [
  [/[–—]/, "em or en dash"],
  [/financial planner|financial advis|wealth manag|robo-?advis/i, "protected or banned title"],
  [/\bAI advisor\b|\byour advisor\b|\bour planners\b/i, "title wording (Compliance B2, CR11 s2)"],
  [/guaranteed (return|growth)|risk-free|can'?t lose|people like you|best for you|you'll have \$/i, "banned promise or steer (Compliance B1, C3)"],
  [/\bauto-?invest|set it and forget it|automatic(ally)? invest/i, "banned automation claim (Compliance B3)"],
];
const ALLOW = [/scripts\/lint-copy\.mjs$/, /packages\/engine\/src\/policy[^/]*\.ts$/];
let hits = 0;
for (const d of dirs) {
  const abs = path.join(root, d);
  if (!fs.existsSync(abs)) continue;
  (function walk(p) {
    for (const f of fs.readdirSync(p)) {
      const q = path.join(p, f);
      if (fs.statSync(q).isDirectory()) { if (f !== "node_modules" && f !== "fixtures") walk(q); continue; }
      if (!/\.(tsx?|json|mjs|js)$/.test(f) || ALLOW.some((r) => r.test(q))) continue;
      const lines = fs.readFileSync(q, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\/?\*)/.test(line)) return;
        if (/(^|[\s(,=:\[])\/[^/\s].*\/[gimsuy]*\s*[,;)\]]/.test(line) && /\\[sbdw]|\[[^\]]*\]|\|/.test(line)) return; /* a regex literal that defines a rule */ /* comments may quote banned words when explaining a rule */
        for (const [re, why] of RULES) if (re.test(line)) { hits++; console.log(`${path.relative(root, q)}:${i + 1}: ${why}: ${line.trim().slice(0, 120)}`); }
        if (/\.json$/.test(f) && /"\s*\[[A-Z][^\]]*\]/.test(line)) { hits++; console.log(`${path.relative(root, q)}:${i + 1}: bracketed placeholder`); }
      });
    }
  })(abs);
}
console.log(hits ? `COPY LINT FAIL: ${hits}` : "COPY LINT PASS");
process.exit(hits ? 1 : 0);
