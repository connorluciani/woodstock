/*
 * Card (a rounded surface inside the gutter) and ConfirmCard (the iMessage-style confirm card used
 * for plan changes, the payday request and order approvals; prototype CR6 cards).
 * ConfirmCard rules (Compliance B3, CR8 s11, Directive 21:21):
 *  - a plan change needs one confirm tap; anything that buys or sells needs Approve plus Face ID
 *    (the screen passes requiresApproval and calls adapters.auth.confirmApproval);
 *  - every approval card names the account on each line and shows "Nothing is sent until you approve."
 *    (pass `lead`); order lines sit behind a "See what this buys" control (pass `details`).
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { gutter, hairline, radius, space } from "../tokens";
import { Text } from "./Text";
import { Button } from "./Controls";

export function Card({ children, style, onPress, testID, padded = true }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; testID?: string; padded?: boolean }) {
  const { c } = useTheme();
  const base = [styles.card, { backgroundColor: c.bgCard, padding: padded ? gutter : 0 }, style];
  if (!onPress) return <View testID={testID} style={base}>{children}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {children}
    </Pressable>
  );
}

export type ConfirmLine = { label: string; sub?: string; value: string };

export function ConfirmCard({
  eyebrow, title, lead, lines, total, details, detailsLabel = "See what this buys", primary, secondary, onPrimary, onSecondary,
  status, busy, disabled, testID, style,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  lines?: ConfirmLine[];
  total?: ConfirmLine;
  details?: React.ReactNode;
  detailsLabel?: string;
  primary?: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  status?: string;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View testID={testID} style={[styles.confirm, { backgroundColor: c.bgCard, borderColor: c.separator }, style]}>
      {eyebrow ? <Text variant="footnote" tone="secondary" style={{ marginBottom: 2 }}>{eyebrow}</Text> : null}
      <Text variant="headline">{title}</Text>
      {lead ? <Text variant="secondary" tone="secondary" style={{ marginTop: space.xs }}>{lead}</Text> : null}
      {lines && lines.length ? (
        <View style={{ marginTop: space.m }}>
          {lines.map((l, i) => (
            <View key={i} style={[styles.line, i > 0 ? { borderTopWidth: hairline, borderTopColor: c.separator } : null]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="secondary">{l.label}</Text>
                {l.sub ? <Text variant="footnote" tone="secondary">{l.sub}</Text> : null}
              </View>
              <Text variant="secondary" numeric>{l.value}</Text>
            </View>
          ))}
          {total ? (
            <View style={[styles.line, { borderTopWidth: hairline, borderTopColor: c.separator }]}>
              <Text variant="secondaryStrong" style={{ flex: 1 }}>{total.label}</Text>
              <Text variant="secondaryStrong" numeric>{total.value}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {details ? (
        <View style={{ marginTop: space.s }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ paddingVertical: space.s }}>
            <Text variant="secondaryStrong" tone="accent">{open ? "Hide the orders" : detailsLabel}</Text>
          </Pressable>
          {open ? details : null}
        </View>
      ) : null}
      {status ? <Text variant="secondaryStrong" tone="positive" style={{ marginTop: space.m }}>{status}</Text> : null}
      {!status && (primary || secondary) ? (
        <View style={{ marginTop: space.m, gap: space.xs }}>
          {primary ? <Button title={primary} onPress={onPrimary} loading={busy} disabled={disabled} /> : null}
          {secondary ? <Button title={secondary} kind="plain" onPress={onSecondary} disabled={busy} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, borderRadius: radius.card },
  confirm: { borderRadius: 18, padding: gutter, borderWidth: hairline, maxWidth: 340, width: "100%" },
  line: { flexDirection: "row", alignItems: "center", gap: space.m, paddingVertical: space.s },
});
