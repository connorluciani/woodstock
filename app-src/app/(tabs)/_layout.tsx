/*
 * Tabs shell (mobile-lead): Home, Plan, Money, Calendar, Messages (prototype TABS; D-01:04, CR11 s7).
 * Custom translucent tab bar matching the prototype's #tabbar. Each tab folder holds its own stack.
 * Redirects to onboarding when there is no state.
 */
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName, TabBarInsetContext, Text, hairline, tabBarHeight, useTheme } from "@/design";
import { useApp } from "@/state/AppState";

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "home", label: "Home", icon: "home" },
  { name: "plan", label: "Plan", icon: "plan" },
  { name: "money", label: "Money", icon: "money" },
  { name: "calendar", label: "Calendar", icon: "calendar" },
  { name: "messages", label: "Messages", icon: "messages" },
];

export const tabBadges: { messages?: number } = {};

function TabBar({ state, emitter, navigateToTab, descriptors }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { height: tabBarHeight + insets.bottom, paddingBottom: insets.bottom, backgroundColor: c.materialBar, borderTopColor: c.separator },
        Platform.OS === "web" ? ({ backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" } as object) : null,
      ]}
    >
      {state.routes.map((route, i) => {
        const t = TABS.find((x) => x.name === route.name);
        if (!t) return null;
        const focused = state.index === i;
        const color = focused ? c.accent : c.tabInactive;
        const badge = descriptors[route.key]?.options.tabBarBadge;
        const onPress = () => {
          /* a tap on the current tab pops its stack to the top (the stacks listen for tabPress) */
          const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            testID={"tab-" + t.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t.label}
            onPress={onPress}
            style={styles.tab}
          >
            <Icon name={t.icon} size={24} color={color} active={focused} />
            <Text variant="tab" style={{ color, marginTop: 3 }}>{t.label}</Text>
            {badge != null ? (
              <View style={[styles.badge, { backgroundColor: c.badge }]}>
                <Text variant="footnote" style={{ color: "#FFFFFF", fontWeight: "600" }}>{String(badge)}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { ready, state } = useApp();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bgGrouped }} />;
  if (!state) return <Redirect href="/welcome" />;
  return (
    <TabBarInsetContext.Provider value={tabBarHeight + insets.bottom}>
      <Tabs
        tabBar={(p) => <TabBar {...p} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bgGrouped } } as object}
      >
        {TABS.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
        ))}
      </Tabs>
    </TabBarInsetContext.Provider>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", borderTopWidth: hairline },
  tab: { flex: 1, alignItems: "center", paddingTop: 7, height: tabBarHeight },
  badge: { position: "absolute", top: 3, left: "50%", marginLeft: 6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
});
