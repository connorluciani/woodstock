/*
 * The demo Face ID HUD (prototype #fid). adapters.auth.confirmApproval() shows it on the web build;
 * on iOS the adapter calls expo-local-authentication instead and this HUD is not used.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../theme";
import { Text } from "./Text";
import { Icon } from "../Icon";

type Req = { label: string; resolve: () => void };
let request: ((r: Req) => void) | null = null;

export function showFaceIdHud(label = "Face ID (demo)"): Promise<void> {
  return new Promise((resolve) => {
    if (!request) return resolve();
    request({ label, resolve });
  });
}

export function FaceIdHost() {
  const { c, scheme } = useTheme();
  const [req, setReq] = useState<Req | null>(null);
  const [ok, setOk] = useState(false);
  const s = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    request = (r) => {
      setOk(false);
      setReq(r);
    };
    return () => {
      request = null;
    };
  }, []);
  useEffect(() => {
    if (!req) return;
    const nd = Platform.OS !== "web";
    s.setValue(0.85);
    Animated.spring(s, { toValue: 1, useNativeDriver: nd, friction: 6 }).start();
    const a = setTimeout(() => setOk(true), 700);
    const b = setTimeout(() => {
      const r = req;
      setReq(null);
      r.resolve();
    }, 1250);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [req, s]);
  if (!req) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} accessibilityLiveRegion="assertive">
      <Animated.View style={[styles.hud, { backgroundColor: scheme === "dark" ? "rgba(44,44,46,0.92)" : "rgba(242,242,247,0.92)", transform: [{ scale: s }] }]}>
        <Icon name={ok ? "check" : "faceid"} size={64} color={ok ? c.positive : c.textPrimary} strokeWidth={ok ? 3 : undefined} />
        <Text variant="headline" style={{ marginTop: 14 }}>{ok ? "Done" : req.label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 950, alignItems: "center", justifyContent: "center" },
  hud: { width: 156, height: 156, borderRadius: 32, alignItems: "center", paddingTop: 30, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 8 } },
});
