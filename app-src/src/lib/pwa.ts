/*
 * PWA wiring for the web build (mobile-lead): registers the service worker that scripts/build-web.mjs
 * writes into the export. Uses the base URL (/woodstock/), so it works under GitHub Pages' subpath.
 */
import { useEffect } from "react";
import { Platform } from "react-native";

export const BASE_URL = "/woodstock/";

export function usePwaSetup() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname === "127.0.0.1") && !location.search.includes("sw=1")) return;
    navigator.serviceWorker.register(BASE_URL + "sw.js", { scope: BASE_URL }).catch(() => {});
  }, []);
}
