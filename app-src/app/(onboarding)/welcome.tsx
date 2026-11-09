/*
 * Welcome (placeholder from the scaffold). OWNER: screens-engineer-a, who replaces it with step 1 of
 * docs/onboarding_streamline.md. Keep: the top-right "Skip" (Directive 01:42) calling startDemo().
 */
import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, DemoPill, Text, WoodstockMark, gutter, space, useTheme } from "@/design";
import { useApp } from "@/state/AppState";

export default function Welcome() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { startDemo } = useApp();
  const skip = async () => {
    await startDemo();
    router.replace("/home");
  };
  return (
    <View testID="screen-welcome" style={{ flex: 1, backgroundColor: c.bgGrouped, paddingTop: insets.top, paddingBottom: insets.bottom + space.l }}>
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: gutter }}>
        <DemoPill />
        <Pressable accessibilityRole="button" onPress={skip} hitSlop={8} testID="welcome-skip">
          <Text variant="body" tone="accent">Skip</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: gutter * 2 }}>
        <WoodstockMark size={88} />
        <Text variant="largeTitle" align="center" style={{ marginTop: space.xl }}>Your money, sorted every payday</Text>
        <Text variant="body" tone="secondary" align="center" style={{ marginTop: space.m }}>About 3 minutes to your plan.</Text>
      </View>
      <View style={{ paddingHorizontal: gutter }}>
        <Button title="Get started" onPress={skip} testID="welcome-start" />
      </View>
    </View>
  );
}
