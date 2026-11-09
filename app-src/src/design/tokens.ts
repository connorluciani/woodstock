/*
 * Woodstock design tokens, ported from the HTML prototype (releases/woodstock_v7_3_2.html, :root and
 * dark blocks) and the UX polish spec (docs/ux_polish_spec.md section 11). Owner: mobile-lead.
 * Screens never hard-code a colour, size or spacing value: they read these tokens through useTheme().
 */
import { Platform, TextStyle } from "react-native";

export type Palette = {
  bgGrouped: string; bgPlain: string; bgCard: string; bgElevated: string;
  fillPrimary: string; fillSecondary: string; fillTertiary: string;
  textPrimary: string; textSecondary: string; textTertiary: string;
  separator: string; separatorOpaque: string;
  accent: string; accentPressed: string; accentTint: string; onAccent: string;
  positive: string; positiveTint: string; negative: string; warning: string; warningTint: string;
  chartLine: string; chartFillTop: string; chartGrid: string; bandLight: string;
  bubbleOut: string; bubbleOutText: string; bubbleIn: string; bubbleInText: string; imessageBlue: string;
  materialBar: string; backdrop: string;
  sleeveCa: string; sleeveUs: string; sleeveIntl: string; sleeveBond: string; sleeveCash: string;
  rowPressed: string; chevron: string; grabber: string; sheetBg: string; sheetCell: string;
  thumb: string; tabInactive: string; badge: string;
};

export const light: Palette = {
  bgGrouped: "#F2F2F7", bgPlain: "#FFFFFF", bgCard: "#FFFFFF", bgElevated: "#FFFFFF",
  fillPrimary: "#78788033", fillSecondary: "#78788029", fillTertiary: "#7676801F",
  textPrimary: "#000000", textSecondary: "#3C3C4399", textTertiary: "#3C3C434D",
  separator: "#3C3C434A", separatorOpaque: "#C6C6C8",
  accent: "#1F5E4B", accentPressed: "#174A3B", accentTint: "#E4EFEA", onAccent: "#FFFFFF",
  positive: "#1A7F45", positiveTint: "#1A7F451F", negative: "#C8372D", warning: "#B26A00", warningTint: "#FBF0DD",
  chartLine: "#1F5E4B", chartFillTop: "#1F5E4B29", chartGrid: "#3C3C431F", bandLight: "#1F5E4B42",
  bubbleOut: "#0A7CFF", bubbleOutText: "#FFFFFF", bubbleIn: "#E9E9EB", bubbleInText: "#000000", imessageBlue: "#007AFF",
  materialBar: "rgba(249,249,249,0.86)", backdrop: "rgba(0,0,0,0.40)",
  sleeveCa: "#1F5E4B", sleeveUs: "#3F7CAC", sleeveIntl: "#7FA7C9", sleeveBond: "#B08D57", sleeveCash: "#8E9399",
  rowPressed: "#D1D1D6", chevron: "#C4C4C6", grabber: "#C7C7CC", sheetBg: "#F2F2F7", sheetCell: "#FFFFFF",
  thumb: "#FFFFFF", tabInactive: "#8E8E93", badge: "#FF3B30",
};

export const dark: Palette = {
  bgGrouped: "#000000", bgPlain: "#000000", bgCard: "#1C1C1E", bgElevated: "#2C2C2E",
  fillPrimary: "#7878805C", fillSecondary: "#78788052", fillTertiary: "#7676803D",
  textPrimary: "#FFFFFF", textSecondary: "#EBEBF599", textTertiary: "#EBEBF54D",
  separator: "#54545899", separatorOpaque: "#38383A",
  accent: "#5FB394", accentPressed: "#4E9C80", accentTint: "#5FB39429", onAccent: "#06251B",
  positive: "#4CC27A", positiveTint: "#4CC27A24", negative: "#FF6A5E", warning: "#FFB340", warningTint: "#FFB34024",
  chartLine: "#5FB394", chartFillTop: "#5FB3942E", chartGrid: "#EBEBF51F", bandLight: "#5FB39447",
  bubbleOut: "#0A84FF", bubbleOutText: "#FFFFFF", bubbleIn: "#26252A", bubbleInText: "#FFFFFF", imessageBlue: "#0A84FF",
  materialBar: "rgba(22,22,24,0.82)", backdrop: "rgba(0,0,0,0.55)",
  sleeveCa: "#5FB394", sleeveUs: "#6FA6D6", sleeveIntl: "#A6C6E4", sleeveBond: "#C9A773", sleeveCash: "#7C8187",
  rowPressed: "#3A3A3C", chevron: "#5A5A5E", grabber: "#5A5A5E", sheetBg: "#1C1C1E", sheetCell: "#2C2C2E",
  thumb: "#636366", tabInactive: "#8E8E93", badge: "#FF453A",
};

/* Spacing scale (pt). UX spec 11.4: 4, 8, 12, 16, 24, 32 and no other values. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const gutter = 16;
export const radius = { cell: 12, button: 14, sheet: 16, card: 16, chip: 999, tile: 7 } as const;
export const hairline = Platform.OS === "web" ? 0.5 : 0.5;
export const rowMinHeight = 44;
export const tabBarHeight = 49;
export const navBarHeight = 44;

const uiFamily = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});
const numFamily = Platform.select({
  web: 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  default: undefined,
});

/* Type scale. UX spec 11.4: large title 34 bold; title 22 bold; headline 17 semibold; body 17;
   secondary 15; footnote 13; caption 12. Letter spacing follows Apple's SF tracking table. */
export type TypeVariant =
  | "largeTitle" | "title1" | "title2" | "headline" | "body" | "bodyStrong" | "callout" | "secondary"
  | "secondaryStrong" | "footnote" | "caption" | "sectionHeader" | "hero" | "heroSmall" | "figure" | "tab";

export const type: Record<TypeVariant, TextStyle> = {
  largeTitle: { fontFamily: uiFamily, fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.37 },
  title1: { fontFamily: uiFamily, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: 0.36 },
  title2: { fontFamily: uiFamily, fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
  headline: { fontFamily: uiFamily, fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43 },
  body: { fontFamily: uiFamily, fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43 },
  bodyStrong: { fontFamily: uiFamily, fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43 },
  callout: { fontFamily: uiFamily, fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.31 },
  secondary: { fontFamily: uiFamily, fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.23 },
  secondaryStrong: { fontFamily: uiFamily, fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.23 },
  footnote: { fontFamily: uiFamily, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08 },
  caption: { fontFamily: uiFamily, fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  sectionHeader: { fontFamily: uiFamily, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08, textTransform: "uppercase" },
  hero: { fontFamily: numFamily, fontSize: 44, lineHeight: 48, fontWeight: "600", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  heroSmall: { fontFamily: numFamily, fontSize: 34, lineHeight: 40, fontWeight: "600", letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
  figure: { fontFamily: numFamily, fontSize: 17, lineHeight: 22, fontWeight: "600", fontVariant: ["tabular-nums"] },
  tab: { fontFamily: uiFamily, fontSize: 10, lineHeight: 12, fontWeight: "500", letterSpacing: 0.1 },
};

export const fonts = { ui: uiFamily, num: numFamily };

export const motion = {
  /* iOS sheet and push curves from the prototype */
  easeIOS: [0.32, 0.72, 0, 1] as const,
  sheetIn: 420, sheetOut: 280, push: 350, press: 100,
};
