/*
 * Buttons, chips, toggles, segmented control, progress, avatar, Demo pill, Terms link.
 * Values from the prototype's .btn, .chip-s, .toggle, .seg, .progress, .avatar-btn.
 * One primary button per screen; secondary actions are text buttons (UX spec 11.5).
 */
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { useTheme } from "../theme";
import { gutter, radius, space } from "../tokens";
import { Text } from "./Text";

type ButtonKind = "primary" | "secondary" | "plain" | "destructive";

export function Button({ title, onPress, kind = "primary", disabled, loading, style, testID, small }: {
  title: string; onPress?: () => void; kind?: ButtonKind; disabled?: boolean; loading?: boolean; style?: ViewStyle; testID?: string; small?: boolean;
}) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.accentTint, plain: "transparent", destructive: "transparent" }[kind];
  const bgPressed = { primary: c.accentPressed, secondary: c.accentTint, plain: "transparent", destructive: "transparent" }[kind];
  const fg = { primary: c.onAccent, secondary: c.accent, plain: c.accent, destructive: c.negative }[kind];
  const height = small ? 30 : kind === "plain" || kind === "destructive" ? 44 : 50;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { height, backgroundColor: pressed ? bgPressed : bg, opacity: disabled ? 0.38 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        small ? { alignSelf: "flex-start", paddingHorizontal: 14, borderRadius: 15 } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text variant={small ? "secondaryStrong" : "bodyStrong"} style={{ color: fg }}>{title}</Text>}
    </Pressable>
  );
}

export type ChipKind = "ok" | "warn" | "mute";
/* Status chip. Green on track, amber needs a look, never a red alarm (Compliance C2). */
export function Chip({ label, kind = "mute" }: { label: string; kind?: ChipKind }) {
  const { c } = useTheme();
  const fg = { ok: c.positive, warn: c.warning, mute: c.textSecondary }[kind];
  const bg = { ok: c.positiveTint, warn: c.warningTint, mute: c.fillTertiary }[kind];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text variant="footnote" style={{ color: fg, fontWeight: "600" }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* Answer chip (interview, pickers): tappable, selected state, nothing preselected by default. */
export function ChoiceChip({ label, selected, onPress, testID }: { label: string; selected?: boolean; onPress: () => void; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: selected ? c.accent : c.accentTint, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Text variant="secondaryStrong" style={{ color: selected ? c.onAccent : c.accent }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ value, onValueChange, accessibilityLabel, testID }: { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string; testID?: string }) {
  const { c } = useTheme();
  return (
    <Switch
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: c.fillPrimary, true: c.accent }}
      thumbColor="#FFFFFF"
      {...({ activeThumbColor: "#FFFFFF" } as object)}
    />
  );
}

export function Segmented<T extends string>({ options, value, onChange, testID }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  const { c, scheme } = useTheme();
  return (
    <View testID={testID} style={[styles.seg, { backgroundColor: c.fillTertiary }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segBtn,
              on ? { backgroundColor: c.thumb, ...(scheme === "light" ? styles.segShadow : null) } : null,
            ]}
          >
            <Text variant="footnote" style={{ fontWeight: on ? "600" : "500", color: c.textPrimary }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { c } = useTheme();
  const p = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[styles.bar, { backgroundColor: c.fillTertiary }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <View style={{ width: `${p * 100}%`, height: "100%", backgroundColor: color ?? c.accent, borderRadius: 3 }} />
    </View>
  );
}

/* Goal ring (prototype ring(p)). */
export function ProgressRing({ value, size = 36, stroke = 4, color }: { value: number; size?: number; stroke?: number; color?: string }) {
  const { c } = useTheme();
  const p = Math.max(0, Math.min(1, value || 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={`${Math.round(p * 100)}%`}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.fillTertiary} strokeWidth={stroke} />
      <Circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? c.accent} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export function Avatar({ initials, size = 36, onPress, testID }: { initials: string; size?: number; onPress?: () => void; testID?: string }) {
  const { c } = useTheme();
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentTint, alignItems: "center", justifyContent: "center" }}>
      <Text variant={size >= 60 ? "title1" : "secondaryStrong"} style={{ color: c.accent }}>{initials}</Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel="Profile and settings" onPress={onPress} hitSlop={6} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}>
      {inner}
    </Pressable>
  );
}

/* Compliance 19:24 and 21:22 floor item 4: a persistent Demo pill on screens with demo figures. */
export function DemoPill() {
  const { c } = useTheme();
  return (
    <View accessibilityLabel="Demo figures" style={[styles.pill, { backgroundColor: c.warningTint }]}>
      <Text variant="caption" style={{ color: c.warning, fontWeight: "600" }}>Demo</Text>
    </View>
  );
}

/* Directive 21:21 item 2 and 22:26 item 2: at most one small Terms link at the foot of a page, or a
   one-line pointer "How this is worked out: see Terms, section N." */
export function TermsLink({ section, pointer, label = "Terms and conditions" }: { section?: number | string; pointer?: boolean; label?: string }) {
  const { c } = useTheme();
  const go = () => router.push({ pathname: "/terms", params: section != null ? { section: String(section) } : {} });
  return (
    <Pressable accessibilityRole="link" onPress={go} style={{ paddingHorizontal: gutter * 2, paddingVertical: space.m, alignSelf: "flex-start" }}>
      <Text variant="footnote" tone="secondary">
        {pointer && section != null ? (
          <>How this is worked out: <Text variant="footnote" style={{ color: c.accent }}>see Terms, section {section}.</Text></>
        ) : (
          <Text variant="footnote" style={{ color: c.accent }}>{label}</Text>
        )}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: "100%", borderRadius: radius.button, alignItems: "center", justifyContent: "center", paddingHorizontal: space.l },
  chip: { height: 22, paddingHorizontal: space.s, borderRadius: radius.chip, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  choice: { minHeight: 36, paddingHorizontal: 14, paddingVertical: space.s, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", height: 32, borderRadius: 9, padding: 2 },
  segBtn: { flex: 1, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  segShadow: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  bar: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: space.s },
  pill: { paddingHorizontal: space.s, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
