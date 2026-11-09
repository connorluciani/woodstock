/*
 * Grouped lists: Section (header, rounded card of rows, footer) and Row, as in the prototype's
 * .sec-h / .list / .row. Rows that open something show a chevron; rows that do nothing have none
 * and are not pressable (UX spec 11.5).
 */
import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { gutter, hairline, radius, rowMinHeight, space } from "../tokens";
import { Text, Tone } from "./Text";
import { Icon } from "../Icon";

type SectionProps = {
  header?: string;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  first?: boolean;
  style?: ViewStyle;
  inset?: boolean;
};

export function Section({ header, title, footer, children, first, style, inset = true }: SectionProps) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginTop: first ? space.l : space.xl }, style]}>
      {title ? (
        <Text variant="title2" style={{ paddingHorizontal: gutter, paddingBottom: space.s }} accessibilityRole="header">{title}</Text>
      ) : header ? (
        <Text variant="sectionHeader" tone="secondary" style={{ paddingLeft: gutter * 2, paddingRight: gutter, paddingBottom: 7 }} accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <View style={[styles.list, { backgroundColor: c.bgCard, marginHorizontal: inset ? gutter : 0 }]}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={[styles.sep, { backgroundColor: c.separator, left: separatorInset(child) }]} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        typeof footer === "string" ? (
          <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: gutter * 2, paddingTop: 7 }}>{footer}</Text>
        ) : (
          <View style={{ paddingHorizontal: gutter * 2, paddingTop: 7 }}>{footer}</View>
        )
      ) : null}
    </View>
  );
}

function separatorInset(child: React.ReactNode): number {
  if (React.isValidElement(child)) {
    const p = child.props as { leading?: unknown };
    if (p && p.leading) return 58;
  }
  return gutter;
}

export type RowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  valueTone?: Tone;
  strongTitle?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  accent?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  subtitleLines?: number;
};

export function Row({ title, subtitle, value, valueTone = "secondary", strongTitle, leading, trailing, chevron, onPress, destructive, accent, testID, accessibilityLabel, subtitleLines = 2 }: RowProps) {
  const { c } = useTheme();
  const showChevron = chevron ?? !!onPress;
  const titleTone: Tone = destructive ? "negative" : accent ? "accent" : "primary";
  const body = (pressed: boolean) => (
    <View style={[styles.row, { backgroundColor: pressed ? c.rowPressed : "transparent" }]}>
      {leading}
      <View style={styles.main}>
        <Text variant={strongTitle ? "bodyStrong" : "body"} tone={titleTone}>{title}</Text>
        {subtitle ? <Text variant="secondary" tone="secondary" numberOfLines={subtitleLines} style={{ marginTop: 1 }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text variant="body" tone={valueTone} numeric style={styles.value}>{value}</Text> : null}
      {trailing}
      {showChevron ? <Icon name="chevronRight" size={13} color={c.chevron} /> : null}
    </View>
  );
  if (!onPress) return <View testID={testID} accessibilityLabel={accessibilityLabel}>{body(false)}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/* A coloured 30 pt rounded tile for row leading icons (prototype .tile). */
export function Tile({ color, children, size = 30 }: { color: string; children: React.ReactNode; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: radius.tile, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.cell, overflow: "hidden" },
  sep: { position: "absolute", top: 0, right: 0, height: hairline, zIndex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: space.m, minHeight: rowMinHeight, paddingVertical: 11, paddingHorizontal: gutter },
  main: { flex: 1, minWidth: 0 },
  value: { flexShrink: 0, textAlign: "right" },
});
