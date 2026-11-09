/* Onboarding stack. OWNER: screens-engineer-a (docs/onboarding_streamline.md is the target flow). */
import React from "react";
import { Stack } from "expo-router/js-stack";
import { useTheme } from "@/design";

export default function OnboardingLayout() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, cardStyle: { backgroundColor: c.bgGrouped }, animation: "slide_from_right" }} />;
}
