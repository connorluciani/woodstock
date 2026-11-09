/* Calendar (empty tab from the scaffold). OWNER: screens-engineer-b. Replace the body; keep testID "screen-calendar". */
import React from "react";
import { router } from "expo-router";
import { Avatar, DemoPill, Screen, Section, Row } from "@/design";
import { useWS } from "@/state/AppState";

export default function CalendarScreen() {
  const s = useWS();
  return (
    <Screen
      testID="screen-calendar"
      title="Calendar"
      large
      left={<DemoPill />}
      right={<Avatar initials={String(s.user?.initials ?? "")} onPress={() => router.push("/profile")} testID="avatar" />}
    >
      <Section first>
        <Row title="Calendar" subtitle="Coming in the next stage." />
      </Section>
    </Screen>
  );
}
