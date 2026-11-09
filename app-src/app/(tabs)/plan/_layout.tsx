/* Plan tab stack. Shell by mobile-lead; screens in this folder are OWNED by screens-engineer-a. */
import React from "react";
import { Stack } from "expo-router/js-stack";
import { useTheme } from "@/design";

export default function PlanStack() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, cardStyle: { backgroundColor: c.bgGrouped }, animation: "slide_from_right", gestureEnabled: true }} />;
}
