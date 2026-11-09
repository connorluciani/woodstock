/* Home (empty tab from the scaffold). OWNER: screens-engineer-a. Replace the body; keep testID "screen-home". */
import React from "react";
import { router } from "expo-router";
import { Avatar, DemoPill, Screen, Section, Row } from "@/design";
import { useWS } from "@/state/AppState";

export default function HomeScreen() {
  const s = useWS();
  return (
    <Screen
      testID="screen-home"
      title="Home"
      large
      left={<DemoPill />}
      right={<Avatar initials={String(s.user?.initials ?? "")} onPress={() => router.push("/profile")} testID="avatar" />}
    >
      <Section first>
        <Row title="Home" subtitle="Coming in the next stage." />
      </Section>
    </Screen>
  );
}
