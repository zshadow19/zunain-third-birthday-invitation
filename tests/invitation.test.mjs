import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/invitation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { invitation, getCountdown, canTransition, restoredScene } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("venue details and directions identify the complete Lakeshore Heights address", () => {
  assert.equal(invitation.venue, "9th Floor, Lakeshore Heights, House 03, Road 126, Gulshan-1, Dhaka 1212, Bangladesh");
  const directions = new URL(invitation.mapsUrl);
  assert.equal(directions.searchParams.get("destination"), "Lakeshore Heights, House 03, Road 126, Gulshan-1, Dhaka 1212, Bangladesh");
});

test("the party timestamp represents 6:30 PM in Dhaka independently of the guest timezone", () => {
  assert.equal(new Date(invitation.startsAt).toISOString(), "2026-11-21T12:30:00.000Z");
  assert.match(new Intl.DateTimeFormat("en-GB", { timeZone: invitation.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(invitation.startsAt)), /18:30/);
});
test("countdown rolls over each unit and clamps at and after the event", () => {
  const start = Date.parse(invitation.startsAt);
  assert.deepEqual(getCountdown(start - ((86400 + 3600 + 60 + 1) * 1000)), { days: 1, hours: 1, minutes: 1, seconds: 1, complete: false });
  assert.deepEqual(getCountdown(start - 86400000), { days: 1, hours: 0, minutes: 0, seconds: 0, complete: false });
  assert.equal(getCountdown(start - 1000).seconds, 1);
  for (const now of [start, start + 1000, start + 86400000]) {
    assert.deepEqual(getCountdown(now), { days: 0, hours: 0, minutes: 0, seconds: 0, complete: true });
  }
});
test("duplicate transition intents cannot start opening or expansion twice", () => {
  assert.equal(canTransition("closed", "opening"), true);
  assert.equal(canTransition("opening", "opening"), false);
  assert.equal(canTransition("reveal", "expanding"), true);
  assert.equal(canTransition("expanding", "expanding"), false);
  assert.equal(canTransition("closed", "expanding"), false);
});
test("every state can recover to the full card and replay can leave either transition", () => {
  for (const state of ["closed", "opening", "reveal", "expanding"]) assert.equal(canTransition(state, "full"), true);
  for (const state of ["opening", "reveal", "expanding", "full"]) assert.equal(canTransition(state, "closed"), true);
});
test("history restoration accepts only completed scenes and tolerates unrelated router state", () => {
  assert.equal(restoredScene({ __NA: true, __zunainInvitation: "reveal" }), "reveal");
  assert.equal(restoredScene({ __NA: true, __zunainInvitation: "full" }), "full");
  for (const value of [null, undefined, 0, "full", {}, { __zunainInvitation: "opening" }, { __zunainInvitation: true }]) assert.equal(restoredScene(value), null);
});
