/* Money tab stack. Shell by mobile-lead; screens in this folder are OWNED by screens-engineer-b. */
import React from "react";
import { Stack } from "expo-router/js-stack";
import { useTheme } from "@/design";

export default function MoneyStack() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, cardStyle: { backgroundColor: c.bgGrouped }, animation: "slide_from_right", gestureEnabled: true }} />;
}
