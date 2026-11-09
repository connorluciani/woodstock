/*
 * Screen: the page frame every route uses.
 * - Tab roots: <Screen title="Home" large right={...}> draws an iOS large title that collapses into a
 *   translucent nav bar as she scrolls (prototype .navbar / .large-title).
 * - Pushed pages: <Screen title="Account" back="Money"> draws a back chevron with the parent's title.
 * - Pads for the safe area and the tab bar, so nothing sits under the home indicator or the tabs.
 */
import React, { createContext, useContext, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "../theme";
import { gutter, hairline, navBarHeight, space, tabBarHeight } from "../tokens";
import { Text } from "./Text";
import { Icon } from "../Icon";

/* The tabs layout provides this so screens inside tabs pad for the tab bar. */
export const TabBarInsetContext = createContext(0);
export function useTabBarInset() {
  return useContext(TabBarInsetContext);
}

type Props = {
  title?: string;
  large?: boolean;
  back?: string | boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  scroll?: boolean;
  plain?: boolean;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
  footer?: React.ReactNode;
  testID?: string;
};

export function Screen({ title, large, back, onBack, right, left, scroll = true, plain, children, contentStyle, footer, testID }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const [solid, setSolid] = useState(false);
  const bg = plain ? c.bgPlain : c.bgGrouped;
  const top = insets.top + navBarHeight;
  const bottomPad = (tabInset || insets.bottom) + space.xxl;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = large ? y > 34 : y > 2;
    if (next !== solid) setSolid(next);
  };

  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));
  const backLabel = typeof back === "string" ? back : "Back";

  const nav = (
    <View pointerEvents="box-none" style={[styles.nav, { paddingTop: insets.top }]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c.materialBar, borderBottomColor: c.separator, borderBottomWidth: hairline, opacity: solid ? 1 : 0 },
          Platform.OS === "web" ? ({ backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" } as object) : null,
        ]}
      />
      <View style={styles.navRow}>
        <View style={styles.navSide}>
          {back ? (
            <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={goBack} hitSlop={8} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.35 : 1 }]}>
              <Icon name="chevronLeft" size={22} color={c.accent} />
              <Text variant="body" tone="accent" numberOfLines={1} style={{ maxWidth: 120 }}>{backLabel}</Text>
            </Pressable>
          ) : (
            left
          )}
        </View>
        <Text variant="headline" numberOfLines={1} style={[styles.navTitle, { opacity: large ? (solid ? 1 : 0) : 1 }]} accessibilityRole="header">
          {title ?? ""}
        </Text>
        <View style={[styles.navSide, { justifyContent: "flex-end" }]}>{right}</View>
      </View>
    </View>
  );

  const head = large && title ? (
    <View style={styles.largeTitle}>
      <Text variant="largeTitle" accessibilityRole="header">{title}</Text>
    </View>
  ) : null;

  return (
    <View testID={testID} style={[styles.fill, { backgroundColor: bg }]}>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[{ paddingTop: top, paddingBottom: bottomPad }, contentStyle]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {head}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingTop: top, paddingBottom: footer ? 0 : bottomPad }, contentStyle]}>
          {head}
          {children}
        </View>
      )}
      {footer ? <View style={{ paddingHorizontal: gutter, paddingTop: space.s, paddingBottom: bottomPad - space.l, backgroundColor: bg }}>{footer}</View> : null}
      {nav}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 40 },
  navRow: { height: navBarHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: space.s },
  navSide: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
  navTitle: { flexShrink: 1, maxWidth: 220, textAlign: "center" },
  back: { flexDirection: "row", alignItems: "center", height: 44, paddingRight: space.s, marginLeft: -space.xs },
  largeTitle: { paddingHorizontal: gutter, paddingTop: 3, paddingBottom: space.s, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
});
