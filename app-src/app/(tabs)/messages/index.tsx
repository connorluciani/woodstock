/* Messages (empty tab from the scaffold). OWNER: screens-engineer-b. Replace the body; keep testID "screen-messages". */
import React from "react";
import { router } from "expo-router";
import { Avatar, DemoPill, Screen, Section, Row } from "@/design";
import { useWS } from "@/state/AppState";

export default function MessagesScreen() {
  const s = useWS();
  return (
    <Screen
      testID="screen-messages"
      title="Messages"
      large
      left={<DemoPill />}
      right={<Avatar initials={String(s.user?.initials ?? "")} onPress={() => router.push("/profile")} testID="avatar" />}
    >
      <Section first>
        <Row title="Messages" subtitle="Coming in the next stage." />
      </Section>
    </Screen>
  );
}
