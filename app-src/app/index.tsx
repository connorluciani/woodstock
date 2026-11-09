/* Entry guard (mobile-lead): no session or unfinished onboarding -> onboarding; otherwise Home. */
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "@/state/AppState";
import { useTheme } from "@/design";

export default function Index() {
  const { ready, session, onboarded } = useApp();
  const { c } = useTheme();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bgGrouped }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  if (!session || !onboarded) return <Redirect href="/welcome" />;
  return <Redirect href="/home" />;
}
