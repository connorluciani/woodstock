/*
 * Sheet: the iOS bottom sheet for tasks with an end (edit, add, choose, confirm, approve) and short
 * explanations (UX spec 11.6). Grabber, a header with Cancel and Done, slides up with the iOS curve,
 * tap the backdrop to dismiss. At most two sheets stacked. Works on iOS and on the web build.
 *
 *   <Sheet visible={open} onClose={() => setOpen(false)} title="Edit goal" done="Save" onDone={save}>
 *     ...
 *   </Sheet>
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { gutter, motion, radius, space } from "../tokens";
import { Text } from "./Text";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  cancel?: string | false;
  done?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  large?: boolean;
  children: React.ReactNode;
  testID?: string;
  scroll?: boolean;
};

export function Sheet({ visible, onClose, title, cancel = "Cancel", done, onDone, doneDisabled, large, children, testID, scroll = true }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const y = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const ease = Easing.bezier(...motion.easeIOS);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.setValue(height);
      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: motion.sheetIn, easing: ease, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(y, { toValue: height, duration: motion.sheetOut, easing: Easing.in(Easing.ease), useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(fade, { toValue: 0, duration: motion.sheetOut, useNativeDriver: Platform.OS !== "web" }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  const maxH = height - insets.top - (large ? 10 : 60);
  const Body = scroll ? ScrollView : View;

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop, opacity: fade }]}>
          <Pressable accessibilityLabel="Close" style={styles.fill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { backgroundColor: c.sheetBg, maxHeight: maxH, height: large ? maxH : undefined, transform: [{ translateY: y }] },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: c.grabber }]} />
          <View style={styles.head}>
            <View style={styles.side}>
              {cancel ? (
                <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
                  <Text variant="body" tone="accent">{cancel}</Text>
                </Pressable>
              ) : null}
            </View>
            <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>{title ?? ""}</Text>
            <View style={[styles.side, { justifyContent: "flex-end" }]}>
              {done ? (
                <Pressable accessibilityRole="button" onPress={onDone ?? onClose} disabled={doneDisabled} hitSlop={8}>
                  <Text variant="bodyStrong" tone="accent" style={{ opacity: doneDisabled ? 0.38 : 1 }}>{done}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Body
            style={scroll ? { flexGrow: 0 } : { flex: large ? 1 : undefined }}
            contentContainerStyle={scroll ? { paddingBottom: insets.bottom + space.l } : undefined}
            keyboardShouldPersistTaps="handled"
          >
            {children}
            {!scroll ? <View style={{ height: insets.bottom + space.l }} /> : null}
          </Body>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 40, shadowOffset: { width: 0, height: -10 },
  },
  grabber: { position: "absolute", top: 5, alignSelf: "center", width: 36, height: 5, borderRadius: 2.5, zIndex: 2 },
  head: { flexDirection: "row", alignItems: "center", height: 36, marginTop: 14, marginBottom: space.s, paddingHorizontal: gutter },
  side: { flex: 1, flexDirection: "row" },
});
