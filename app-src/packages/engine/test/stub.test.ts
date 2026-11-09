import test from "node:test";
import assert from "node:assert/strict";
import { seedState, ENGINE_VERSION } from "../src/index.ts";

test("stub: seed state loads as the Skip profile", () => {
  const s = seedState();
  assert.equal(typeof ENGINE_VERSION, "string");
  assert.equal(s.user.firstName, "Alandra");
  assert.ok(Array.isArray(s.goals) && s.goals.length > 0);
});
