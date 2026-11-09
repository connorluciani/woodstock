/*
 * Root layout (mobile-lead). Providers, the root stack, and the global overlays (toast, Face ID HUD).
 * Route groups: (onboarding) owned by screens-engineer-a; (tabs) shell by mobile-lead with each tab's
 * folder owned per CLAUDE.md; root modals: payday and talk (screens-engineer-b), profile and terms (lead).
 */
import React from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router/js-stack";
import { ThemeProvider, useTheme, ToastHost, FaceIdHost } from "@/design";
import { AppProvider } from "@/state/AppState";
import { usePwaSetup } from "@/lib/pwa";

function Shell() {
  const { c, scheme } = useTheme();
  usePwaSetup();
  return (
    <View style={{ flex: 1, backgroundColor: c.bgGrouped }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: c.bgGrouped },
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="(onboarding)" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="profile" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="terms" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="payday" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="talk" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      <ToastHost />
      <FaceIdHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export const unstable_settings = { initialRouteName: "index" };
void Platform;
