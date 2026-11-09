"use strict";
/* Loads every script block of a prototype release (woodstock_vN.html) into a Node vm sandbox with DOM stubs.
   Dev tool only: used by scripts/oracle.cjs to record the prototype figures the engine tests compare against. */
const fs = require("fs"), vm = require("vm");
module.exports = function load(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const blocks = []; const re = /<script(?: id="[^"]*")?>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(html))) blocks.push(m[1]);
  const noop = () => {}; 
  const node = () => { const n = { style: {}, dataset: {}, children: [], childNodes: [], classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, setAttribute: noop, getAttribute: () => null, removeAttribute: noop, appendChild: (c) => c, insertBefore: (c) => c, removeChild: noop, addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [], cloneNode: () => node(), remove: noop, append: noop, prepend: noop, closest: () => null, getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }) }; return n; };
  const doc = { addEventListener: noop, removeEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: node, createElementNS: node, createTextNode: node, createDocumentFragment: node,
    documentElement: { getAttribute: () => null, setAttribute: noop, removeAttribute: noop, style: {}, classList: { add: noop, remove: noop, toggle: noop } }, readyState: "loading", body: node(), head: node() };
  const ctx = { document: doc, navigator: {}, console: { log: noop, warn: noop, error: noop, info: noop }, Intl, Date, Math, JSON, setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }), requestAnimationFrame: noop, getComputedStyle: () => ({ getPropertyValue: () => "" }), localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    performance: { now: () => 0 }, location: { hash: "", search: "", href: "" }, history: { replaceState: noop, pushState: noop }, addEventListener: noop, removeEventListener: noop, Promise, Object, Array, String, Number, RegExp, Error, isFinite, isNaN, parseFloat, parseInt, Infinity, NaN,
    MutationObserver: function () { return { observe: noop, disconnect: noop }; }, ResizeObserver: function () { return { observe: noop, disconnect: noop }; }, IntersectionObserver: function () { return { observe: noop, disconnect: noop }; } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; vm.createContext(ctx);
  const errs = [];
  blocks.forEach((b, i) => { if (b.length > 3e6) return; try { vm.runInContext(b, ctx, { filename: "b" + i + ".js" }); } catch (e) { errs.push(i + ": " + e.message); } });
  ctx.WS._loadErrors = errs;
  return ctx.WS;
};
