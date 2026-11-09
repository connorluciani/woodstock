import React from "react";
import { Text as RNText, TextProps, TextStyle } from "react-native";
import { type as typeScale, TypeVariant } from "../tokens";
import { useTheme } from "../theme";

export type Tone = "primary" | "secondary" | "tertiary" | "accent" | "positive" | "negative" | "warning" | "onAccent";

type Props = TextProps & { variant?: TypeVariant; tone?: Tone; align?: TextStyle["textAlign"]; numeric?: boolean };

/*
 * The only text primitive screens use. It applies the type scale and a semantic colour.
 * Copy rule (CLAUDE.md): no em dashes, en-CA figures, one name per concept (UX spec 11.3).
 */
export function Text({ variant = "body", tone = "primary", align, numeric, style, ...rest }: Props) {
  const { c } = useTheme();
  const color = {
    primary: c.textPrimary, secondary: c.textSecondary, tertiary: c.textTertiary, accent: c.accent,
    positive: c.positive, negative: c.negative, warning: c.warning, onAccent: c.onAccent,
  }[tone];
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color, textAlign: align }, numeric ? { fontVariant: ["tabular-nums"] } : null, style]}
    />
  );
}
