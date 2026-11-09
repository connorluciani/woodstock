/*
 * Icon set, ported path for path from the prototype's ICONS table (24 x 24, 1.6 stroke, round caps).
 * Tab icons take `active`: heavier stroke and a soft fill, as the prototype's tab bar does.
 */
import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "home" | "plan" | "money" | "calendar" | "messages" | "person" | "chevronRight" | "chevronLeft"
  | "up" | "down" | "info" | "bell" | "link" | "shield" | "plus" | "replay" | "doc" | "moon" | "check"
  | "close" | "mic" | "faceid" | "send" | "bank";

type Props = { name: IconName; size?: number; color: string; active?: boolean; strokeWidth?: number };

export function Icon({ name, size = 24, color, active = false, strokeWidth }: Props) {
  const sw = strokeWidth ?? (active ? 2 : 1.6);
  const fillSoft = active ? color : "none";
  const fo = active ? 0.16 : 0;
  const common = { stroke: color, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (name) {
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3.75 10.25 12 3.75l8.25 6.5" {...common} />
          <Path d="M5.75 9v10.5c0 .41.34.75.75.75h3.75v-5.5h3.5v5.5h3.75c.41 0 .75-.34.75-.75V9" {...common} fill={fillSoft} fillOpacity={fo} />
        </Svg>
      );
    case "plan":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z" {...common} />
          <Path d="M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9Z" {...common} />
          <Path d="M12 11.25a.75.75 0 1 0 0 1.5a.75.75 0 1 0 0-1.5Z" {...common} fill={active ? color : "none"} />
        </Svg>
      );
    case "money":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M10.5 4.6A8 8 0 1 0 19.4 13.5H10.5Z" {...common} fill={fillSoft} fillOpacity={fo} />
          <Path d="M13.5 2.5a8 8 0 0 1 8 8h-8Z" {...common} fill={fillSoft} fillOpacity={fo} />
        </Svg>
      );
    case "calendar":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} {...common} fill={fillSoft} fillOpacity={fo} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...common} />
        </Svg>
      );
    case "messages":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 4c-4.97 0-9 3.36-9 7.5 0 2.2 1.14 4.18 2.95 5.55-.2 1.3-.85 2.48-1.7 3.2 1.9.1 3.62-.5 4.86-1.42.92.24 1.89.37 2.89.37 4.97 0 9-3.36 9-7.5S16.97 4 12 4Z" {...common} fill={fillSoft} fillOpacity={fo} />
        </Svg>
      );
    case "person":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8Z" {...common} />
          <Path d="M4.75 20.25c.85-3.35 3.75-5.5 7.25-5.5s6.4 2.15 7.25 5.5" {...common} />
        </Svg>
      );
    case "chevronRight":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9.5 6l6 6-6 6" {...common} strokeWidth={strokeWidth ?? 2.4} />
        </Svg>
      );
    case "chevronLeft":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M15 5.5 8.5 12l6.5 6.5" {...common} strokeWidth={strokeWidth ?? 2.4} />
        </Svg>
      );
    case "up":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 17 17 7M9 7h8v8" {...common} strokeWidth={strokeWidth ?? 2.2} />
        </Svg>
      );
    case "down":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 7l10 10M17 9v8H9" {...common} strokeWidth={strokeWidth ?? 2.2} />
        </Svg>
      );
    case "info":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...common} strokeWidth={strokeWidth ?? 2} />
          <Path d="M12 11v5.5M12 7.6v.1" {...common} strokeWidth={strokeWidth ?? 2} />
        </Svg>
      );
    case "bell":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5Z" {...common} />
          <Path d="M10 21h4" {...common} />
        </Svg>
      );
    case "link":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" {...common} />
          <Path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" {...common} />
        </Svg>
      );
    case "shield":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6Z" {...common} />
          <Path d="M9 12l2.2 2.2L15.5 10" {...common} />
        </Svg>
      );
    case "plus":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" {...common} />
        </Svg>
      );
    case "replay":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 12a8 8 0 1 0 2.4-5.7" {...common} />
          <Path d="M4 4v4.5h4.5" {...common} />
        </Svg>
      );
    case "doc":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z" {...common} />
          <Path d="M14 3.5V8h4M9 12h6M9 15.5h6" {...common} />
        </Svg>
      );
    case "moon":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" {...common} />
        </Svg>
      );
    case "check":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} strokeWidth={strokeWidth ?? 2.4} />
        </Svg>
      );
    case "close":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...common} strokeWidth={strokeWidth ?? 2.2} />
        </Svg>
      );
    case "mic":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={9} y={3} width={6} height={11} rx={3} {...common} />
          <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...common} />
        </Svg>
      );
    case "faceid":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M6 20V12a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8" {...common} strokeWidth={strokeWidth ?? 3.5} />
          <Path d="M22 24v4M42 24v4M32 24v12h-3M24 44c4.5 4 11.5 4 16 0" {...common} strokeWidth={strokeWidth ?? 3.5} />
        </Svg>
      );
    case "send":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={11} fill={color} />
          <Path d="M12 17V7.5M7.8 11.5 12 7.3l4.2 4.2" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case "bank":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3.5 9.5 12 4.5l8.5 5M5 10v7.5M9.5 10v7.5M14.5 10v7.5M19 10v7.5M3.5 20h17" {...common} />
        </Svg>
      );
  }
}

/* The Woodstock mark (prototype wsMark): green rounded square with the white W stroke. */
export function WoodstockMark({ size = 40, round = false }: { size?: number; round?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {round ? <Circle cx={60} cy={60} r={60} fill="#1F5E4B" /> : <Rect width={120} height={120} rx={27} fill="#1F5E4B" />}
      <Path d="M25 45 L41 82 L60 52 L79 82 L97 34" fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
