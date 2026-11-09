/* Plan (empty tab from the scaffold). OWNER: screens-engineer-a. Replace the body; keep testID "screen-plan". */
import React from "react";
import { router } from "expo-router";
import { Avatar, DemoPill, Screen, Section, Row } from "@/design";
import { useWS } from "@/state/AppState";

export default function PlanScreen() {
  const s = useWS();
  return (
    <Screen
      testID="screen-plan"
      title="Plan"
      large
      left={<DemoPill />}
      right={<Avatar initials={String(s.user?.initials ?? "")} onPress={() => router.push("/profile")} testID="avatar" />}
    >
      <Section first>
        <Row title="Plan" subtitle="Coming in the next stage." />
      </Section>
    </Screen>
  );
}
