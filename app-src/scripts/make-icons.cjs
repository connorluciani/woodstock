/* Generates the app and PWA icons from the Woodstock mark. Run: node scripts/make-icons.cjs (needs sharp). */
const path = require("path");
let sharp; try { sharp = require("sharp"); } catch { sharp = require("/opt/npm-tools/node_modules/sharp"); }
const W = (pad, bg = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#256E58"/><stop offset="1" stop-color="#1A5040"/></linearGradient></defs>${bg ? '<rect width="120" height="120" fill="url(#g)"/>' : ""}<g transform="translate(${pad} ${pad}) scale(${(120 - 2 * pad) / 120})"><path d="M25 45 L41 82 L60 52 L79 82 L97 34" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
const root = path.join(__dirname, "..");
const out = [
  ["assets/icon.png", 1024, 0], ["assets/favicon.png", 48, 0], ["assets/splash-icon.png", 512, 0],
  ["public/icons/apple-touch-icon.png", 180, 0], ["public/icons/icon-192.png", 192, 0], ["public/icons/icon-512.png", 512, 0],
  ["public/icons/maskable-512.png", 512, 14],
];
(async () => {
  for (const [f, s, pad] of out) await sharp(Buffer.from(W(pad))).resize(s, s).png().toFile(path.join(root, f));
  console.log("icons written");
})();
