/*
 * Profile and settings (mobile-lead): Appearance (Directive 01:32b), Terms (Directive 21:21 keeps the
 * Profile link), sell orders toggle (onboarding_streamline: Settings only, default off), sign out and
 * account deletion (Apple 5.1.1(v)). Screens engineers may post rows they need as "SHELL PATCH".
 */
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Avatar, Button, Screen, Section, Row, Segmented, Sheet, Text, Toggle, gutter, space, useTheme, type ThemeMode } from "@/design";
import { useApp } from "@/state/AppState";

export default function Profile() {
  const { mode, setMode } = useTheme();
  const { state, session, update, signOut, deleteAccount } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const u = (state?.user ?? {}) as { name?: string; initials?: string; email?: string; memberSince?: string };
  const allowSells = !!(state?.settings as { allowSells?: boolean } | undefined)?.allowSells;
  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  const leave = async (fn: () => Promise<void>) => {
    await fn();
    router.replace("/welcome");
  };
  return (
    <Screen
      testID="screen-profile"
      title="Profile"
      right={
        <Pressable accessibilityRole="button" onPress={close} hitSlop={8}>
          <Text variant="bodyStrong" tone="accent">Done</Text>
        </Pressable>
      }
    >
      <View style={{ alignItems: "center", paddingTop: space.s, paddingHorizontal: gutter }}>
        <Avatar initials={u.initials ?? ""} size={72} />
        <Text variant="title2" style={{ marginTop: 10 }}>{u.name ?? ""}</Text>
        {u.email ? <Text variant="secondary" tone="secondary">{u.email}</Text> : null}
      </View>

      <Section header="Appearance">
        <View style={{ padding: gutter }}>
          <Segmented<ThemeMode>
            testID="appearance"
            value={mode}
            onChange={setMode}
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "auto", label: "Automatic" }]}
          />
        </View>
      </Section>

      <Section header="Investing">
        <Row
          title="Allow sell orders for withdrawals"
          trailing={
            <Toggle
              accessibilityLabel="Allow sell orders for withdrawals"
              value={allowSells}
              onValueChange={(v) => update((d) => { (d.settings as { allowSells?: boolean }).allowSells = v; })}
            />
          }
        />
      </Section>

      <Section header="Legal">
        <Row title="Terms and conditions" subtitle={session?.termsAcceptedAt ? "Accepted" : undefined} onPress={() => router.push("/terms")} />
      </Section>

      <Section>
        <Row title="Sign out" accent onPress={() => leave(signOut)} chevron={false} />
        <Row title="Delete account" destructive onPress={() => setConfirmDelete(true)} chevron={false} />
      </Section>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account">
        <View style={{ paddingHorizontal: gutter, gap: space.m }}>
          <Text variant="body">This removes your Woodstock account and everything it holds on this device.</Text>
          <Button title="Delete account" kind="destructive" onPress={() => leave(deleteAccount)} testID="confirm-delete" />
        </View>
      </Sheet>
    </Screen>
  );
}
