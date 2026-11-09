/*
 * Terms and conditions (mobile-lead). Content: src/content/terms.json, ported from the prototype's
 * WS.TERMS with Compliance's 16-section numbering (Compliance 22:27). Screens link here with
 * <TermsLink section={N} pointer /> ("How this is worked out: see Terms, section N.").
 * Copy changes go through Compliance (CLAUDE.md, Legal guardrails).
 */
import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, gutter, space, useTheme } from "@/design";
import TERMS from "@/content/terms.json";

export default function Terms() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const target = section ? Number(section) || TERMS.sections.findIndex((s) => s.id === section) + 1 : 0;
  const ys = useRef<Record<number, number>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scroller = useRef<any>(null);
  return (
    <View testID="screen-terms" style={{ flex: 1, backgroundColor: c.bgGrouped, paddingTop: insets.top }}>
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: gutter }}>
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={8}>
          <Text variant="bodyStrong" tone="accent">Done</Text>
        </Pressable>
      </View>
      <ScrollView ref={scroller} contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: insets.bottom + space.xxl }}>
        <Text variant="title1">Terms and conditions</Text>
        <Text variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>{TERMS.banner} {TERMS.version}</Text>
        {TERMS.sections.map((s, i) => (
          <View
            key={s.id}
            onLayout={(e) => {
              ys.current[i + 1] = e.nativeEvent.layout.y;
              if (target === i + 1) setTimeout(() => scroller.current?.scrollTo({ y: e.nativeEvent.layout.y - space.s, animated: false }), 50);
            }}
            style={{ marginTop: space.xl, padding: target === i + 1 ? space.m : 0, marginHorizontal: target === i + 1 ? -space.m : 0, borderRadius: 12, backgroundColor: target === i + 1 ? c.accentTint : "transparent" }}
          >
            <Text variant="headline">{i + 1}. {s.h}</Text>
            {String(s.p).split("\n").map((para, k) => (
              <Text key={k} variant="callout" tone="secondary" style={{ marginTop: space.s }}>{para}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
