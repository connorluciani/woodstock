/*
 * Charts ported from the prototype.
 *
 * SpendingChart (prototype spendChart + attachScrub, CR11 s5, founder 21:16): everyday spending this
 * month against the usual month, two smooth monotone curves (Fritsch-Carlson, no overshoot), a dot on
 * today, press and drag to read any day. Both lines always show (UX spec E1, E2).
 *   usual[d], now[d]: cumulative dollars by day d (index 0 is the start of the month, unused for
 *   drawing); `now` stops at today.
 *
 * BandChart (prototype .pfb-*, Directive 21:21 item 1): one portfolio's illustrated range: a light band
 * from the rough year to the good year, a dark band for the typical range, a line at what she put in.
 * The same scale (min, max) must be passed for all four cards. The word "Illustration" is the
 * Compliance floor label and stays beside it (pass `label`).
 */
import React, { useMemo, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme";
import { radius, space } from "../tokens";
import { Text } from "./Text";

export function monotonePath(points: [number, number][]): string {
  const P = points;
  if (P.length === 0) return "";
  if (P.length === 1) return `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  const n = P.length, dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let k = 0; k < n - 1; k++) { dx.push(P[k + 1][0] - P[k][0]); m.push((P[k + 1][1] - P[k][1]) / (dx[k] || 1)); }
  t.push(m[0]);
  for (let k = 1; k < n - 1; k++) t.push(m[k - 1] * m[k] <= 0 ? 0 : (m[k - 1] + m[k]) / 2);
  t.push(m[n - 2]);
  for (let k = 0; k < n - 1; k++) {
    if (m[k] === 0) { t[k] = 0; t[k + 1] = 0; continue; }
    const a = t[k] / m[k], b = t[k + 1] / m[k], s2 = a * a + b * b;
    if (s2 > 9) { const tau = 3 / Math.sqrt(s2); t[k] = tau * a * m[k]; t[k + 1] = tau * b * m[k]; }
  }
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let k = 0; k < n - 1; k++) {
    const h = dx[k] / 3;
    d += `C${(P[k][0] + h).toFixed(1)} ${(P[k][1] + t[k] * h).toFixed(1)} ${(P[k + 1][0] - h).toFixed(1)} ${(P[k + 1][1] - t[k + 1] * h).toFixed(1)} ${P[k + 1][0].toFixed(1)} ${P[k + 1][1].toFixed(1)}`;
  }
  return d;
}

type SpendProps = {
  usual: number[];
  now: number[];
  warn?: boolean;
  startLabel: string;
  endLabel: string;
  dayLabel: (d: number) => string;
  money: (n: number) => string;
  height?: number;
  testID?: string;
};

export function SpendingChart({ usual, now, warn, startLabel, endLabel, dayLabel, money, height = 132, testID }: SpendProps) {
  const { c } = useTheme();
  const [w, setW] = useState(358);
  const [scrub, setScrub] = useState<number | null>(null);
  const H = height, pad = 6, n = Math.max(1, usual.length - 1);
  const col = warn ? c.warning : c.accent;

  const g = useMemo(() => {
    const vals = usual.slice(1).concat(now.slice(1));
    const min0 = vals.length ? Math.min(...vals) : 0, max0 = vals.length ? Math.max(...vals) : 1, span = Math.max(1, max0 - min0);
    const lo = min0 - span * 0.06, hi = max0 + span * 0.08;
    const x = (i: number) => pad + ((w - 2 * pad) * i) / n;
    const y = (v: number) => Math.max(6, Math.min(H - 18, H - 18 - ((H - 30) * Math.max(0, v - lo)) / (hi - lo || 1)));
    const pts = (a: number[]) => a.slice(1).map((v, i) => [x(i + 1), y(v || 0)] as [number, number]);
    return { x, y, usualD: monotonePath(pts(usual)), nowD: monotonePath(pts(now)) };
  }, [usual, now, w, H, n]);

  const ti = now.length - 1;
  const onLayout = (e: LayoutChangeEvent) => setW(Math.max(100, e.nativeEvent.layout.width));
  const dayAt = (e: GestureResponderEvent) => {
    const xv = e.nativeEvent.locationX;
    return Math.max(1, Math.min(n, Math.round(((xv - pad) / (w - 2 * pad)) * n)));
  };

  const d = scrub;
  const u = d != null ? usual[d] || 0 : 0;
  const t = d != null && d < now.length ? now[d] : null;
  const tipLeft = d != null ? Math.max(0, Math.min(w - 160, g.x(d) - 80)) : 0;

  return (
    <View testID={testID} onLayout={onLayout} style={{ height: H }}>
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setScrub(dayAt(e))}
        onResponderMove={(e) => setScrub(dayAt(e))}
        onResponderRelease={() => setScrub(null)}
        onResponderTerminate={() => setScrub(null)}
        accessibilityRole="image"
        accessibilityLabel="Everyday spending this month, not bills, compared with your usual month. Press and drag to see each day."
      >
        <Svg width={w} height={H} pointerEvents="none">
          <Line x1={pad} x2={w - pad} y1={H - 18} y2={H - 18} stroke={c.separator} strokeWidth={1} />
          <Path d={g.usualD} fill="none" stroke={c.textTertiary} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d={g.nowD} fill="none" stroke={col} strokeWidth={2.6} strokeLinejoin="round" />
          {ti >= 1 ? <Circle cx={g.x(ti)} cy={g.y(now[ti] || 0)} r={4.5} fill={col} stroke={c.bgCard} strokeWidth={2} /> : null}
          {d != null ? (
            <>
              <Line x1={g.x(d)} x2={g.x(d)} y1={6} y2={H - 18} stroke={c.textSecondary} strokeWidth={1} />
              <Circle cx={g.x(d)} cy={g.y(u)} r={4} fill={c.textTertiary} />
              {t != null ? <Circle cx={g.x(d)} cy={g.y(t)} r={4} fill={col} /> : null}
            </>
          ) : null}
          <SvgText x={pad} y={H - 3} fontSize={11} fill={c.textSecondary}>{startLabel}</SvgText>
          <SvgText x={w - pad} y={H - 3} fontSize={11} fill={c.textSecondary} textAnchor="end">{endLabel}</SvgText>
        </Svg>
      </View>
      {d != null ? (
        <View pointerEvents="none" style={[styles.tip, { left: tipLeft, backgroundColor: c.bgElevated }]}>
          <Text variant="footnote" style={{ fontWeight: "600" }}>{dayLabel(d)}</Text>
          {t == null ? (
            <Text variant="footnote" tone="secondary">Usual by {dayLabel(d)}: {money(u)}</Text>
          ) : (
            <>
              <Text variant="footnote" tone="secondary">This month: {money(t)}</Text>
              <Text variant="footnote" tone="secondary">Usual: {money(u)}</Text>
              <Text variant="footnote" tone="secondary">{t - u >= 0 ? `${money(t - u)} above usual` : `${money(u - t)} below usual`}</Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

type BandProps = {
  min: number;
  max: number;
  rough: number;
  typicalLow: number;
  typicalHigh: number;
  good: number;
  putIn: number;
  money: (n: number) => string;
  label?: string;
  testID?: string;
};

export function BandChart({ min, max, rough, typicalLow, typicalHigh, good, putIn, money, label = "Illustration", testID }: BandProps) {
  const { c } = useTheme();
  const span = Math.max(1, max - min);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
  const L5 = pct(rough), L95 = pct(good), L25 = pct(typicalLow), L75 = pct(typicalHigh), P = pct(putIn);
  const putAlign = P < 12 ? "start" : P > 88 ? "end" : "mid";
  return (
    <View testID={testID} style={{ marginTop: space.m }}>
      <View style={{ height: 18, position: "relative" }}>
        <Text
          variant="caption"
          style={[
            styles.putLabel,
            { left: `${P}%` as unknown as number, transform: [{ translateX: putAlign === "start" ? -2 : putAlign === "end" ? -80 : -40 }], width: 80, textAlign: putAlign === "start" ? "left" : putAlign === "end" ? "right" : "center" },
          ]}
          numberOfLines={1}
        >
          Put in
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.fillTertiary }]}>
        <View style={[styles.band, { left: `${L5}%`, width: `${Math.max(1, L95 - L5)}%`, backgroundColor: c.bandLight }]} />
        <View style={[styles.band, { left: `${L25}%`, width: `${Math.max(1, L75 - L25)}%`, backgroundColor: c.accent, borderRadius: 4 }]} />
        <View style={[styles.putLine, { left: `${P}%`, backgroundColor: c.textPrimary, borderColor: c.bgCard }]} />
      </View>
      <View style={{ marginTop: 10, gap: 2 }}>
        <LegendRow swatch={c.bandLight} label="Rough year" value={`about ${money(rough)}`} />
        <LegendRow swatch={c.accent} label="Typical" value={`${money(typicalLow)} to ${money(typicalHigh)}`} />
        <LegendRow swatch={c.bandLight} label="Good year" value={`about ${money(good)}`} />
      </View>
      <Text variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>{label}</Text>
    </View>
  );
}

function LegendRow({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: swatch }} />
      <Text variant="secondary">{label}: </Text>
      <Text variant="secondaryStrong" numeric>{value}</Text>
    </View>
  );
}

/* Mix bar (prototype .split): segments by weight, e.g. stocks and bonds, or budget parts. */
export function MixBar({ parts, height = 10 }: { parts: { value: number; color: string; label?: string }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  return (
    <View style={{ flexDirection: "row", height, borderRadius: height / 2, overflow: "hidden", gap: 2, marginTop: space.m }} accessibilityRole="image" accessibilityLabel={parts.map((p) => p.label).filter(Boolean).join(", ")}>
      {parts.map((p, i) => (
        <View key={i} style={{ flexGrow: Math.max(0, p.value) / total, flexBasis: 0, backgroundColor: p.color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: { position: "absolute", top: 0, width: 160, borderRadius: 10, padding: space.s, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  track: { height: 18, borderRadius: 5, position: "relative", overflow: "visible" },
  band: { position: "absolute", top: 0, bottom: 0, borderRadius: radius.tile - 2 },
  putLine: { position: "absolute", top: -5, bottom: -5, width: 2, marginLeft: -1, borderRadius: 1 },
  putLabel: { position: "absolute", top: 0, fontWeight: "600" },
});
