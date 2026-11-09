/*
 * Theme provider. Directive 01:32b: Light / Dark / Automatic, default Light on first load,
 * Automatic follows the phone. The choice persists. Owner: mobile-lead.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import { dark, light, Palette } from "./tokens";
import { getJSON, setJSON } from "@/adapters/storage";

export type ThemeMode = "light" | "dark" | "auto";

type ThemeValue = {
  c: Palette;
  scheme: "light" | "dark";
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const Ctx = createContext<ThemeValue>({ c: light, scheme: "light", mode: "light", setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    let live = true;
    getJSON<ThemeMode>("theme", "light").then((m) => {
      if (live && (m === "light" || m === "dark" || m === "auto")) setModeState(m);
    });
    return () => {
      live = false;
    };
  }, []);

  const scheme: "light" | "dark" = mode === "auto" ? (system === "dark" ? "dark" : "light") : mode;
  const c = scheme === "dark" ? dark : light;

  /* Web: keep the browser chrome, body background and color-scheme in step (status bar in the PWA). */
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", scheme);
    root.style.colorScheme = scheme;
    document.body.style.backgroundColor = c.bgGrouped;
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = c.bgGrouped;
  }, [scheme, c.bgGrouped]);

  const value = useMemo<ThemeValue>(
    () => ({
      c,
      scheme,
      mode,
      setMode: (m) => {
        setModeState(m);
        setJSON("theme", m);
      },
    }),
    [c, scheme, mode]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(Ctx);
}
