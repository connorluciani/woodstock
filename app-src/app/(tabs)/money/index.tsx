/* Money (empty tab from the scaffold). OWNER: screens-engineer-b. Replace the body; keep testID "screen-money". */
import React from "react";
import { router } from "expo-router";
import { Avatar, DemoPill, Screen, Section, Row } from "@/design";
import { useWS } from "@/state/AppState";

export default function MoneyScreen() {
  const s = useWS();
  return (
    <Screen
      testID="screen-money"
      title="Money"
      large
      left={<DemoPill />}
      right={<Avatar initials={String(s.user?.initials ?? "")} onPress={() => router.push("/profile")} testID="avatar" />}
    >
      <Section first>
        <Row title="Money" subtitle="Coming in the next stage." />
      </Section>
    </Screen>
  );
}
