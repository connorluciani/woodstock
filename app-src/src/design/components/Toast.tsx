/*
 * Toast: the prototype's top banner ("Subscribed (demo)", "Saved"). Call toast(title, body) anywhere.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { gutter, motion, space } from "../tokens";
import { Text } from "./Text";

type T = { title: string; body?: string; id: number };
let push: ((t: T) => void) | null = null;
let seq = 0;

export function toast(title: string, body?: string) {
  push?.({ title, body, id: ++seq });
}

export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [t, setT] = useState<T | null>(null);
  const y = useRef(new Animated.Value(-160)).current;
  useEffect(() => {
    push = (next) => setT(next);
    return () => {
      push = null;
    };
  }, []);
  useEffect(() => {
    if (!t) return;
    const nd = Platform.OS !== "web";
    Animated.timing(y, { toValue: 0, duration: 420, easing: Easing.bezier(...motion.easeIOS), useNativeDriver: nd }).start();
    const h = setTimeout(() => {
      Animated.timing(y, { toValue: -160, duration: 300, useNativeDriver: nd }).start(() => setT(null));
    }, 2600);
    return () => clearTimeout(h);
  }, [t, y]);
  if (!t) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toast, { top: insets.top + space.s, backgroundColor: c.bgElevated, transform: [{ translateY: y }] }]}>
      <View style={{ flex: 1 }}>
        <Text variant="secondaryStrong">{t.title}</Text>
        {t.body ? <Text variant="secondary" tone="secondary">{t.body}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute", left: gutter, right: gutter, zIndex: 800, borderRadius: 14, paddingVertical: space.m, paddingHorizontal: 14,
    flexDirection: "row", gap: 10, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 8 },
  },
});
