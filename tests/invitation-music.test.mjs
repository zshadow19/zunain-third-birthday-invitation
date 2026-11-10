import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/invitation-music.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { createInvitationMusic, invitationMusic } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

class AudioStub extends EventTarget {
  paused = true;
  volume = 1;
  currentTime = 0;
  plays = [];
  pauses = 0;
  loads = 0;
  throwOnPlay = false;
  play() {
    if (this.throwOnPlay) throw new Error("play unavailable");
    this.paused = false;
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    this.plays.push({ resolve, reject });
    return promise;
  }
  pause() {
    this.pauses += 1;
    const wasPlaying = !this.paused;
    this.paused = true;
    if (wasPlaying) this.dispatchEvent(new Event("pause"));
  }
  succeed(index = this.plays.length - 1) {
    this.dispatchEvent(new Event("playing"));
    this.plays[index].resolve();
  }
  removeAttribute(name) { if (name === "src") this.src = ""; }
  load() { this.loads += 1; this.currentTime = 0; }
}

function fixture(audio = new AudioStub()) {
  const doc = new EventTarget(); doc.hidden = false;
  const frames = new Map(); let frameId = 0;
  Object.assign(globalThis, { document:doc, requestAnimationFrame:callback => { const id = ++frameId; frames.set(id, callback); return id; }, cancelAnimationFrame:id => frames.delete(id) });
  const states = [];
  const controller = createInvitationMusic(audio, value => states.push(value));
  return { audio, doc, controller, states, frames,
    tick(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); },
    visibility(hidden) { doc.hidden = hidden; doc.dispatchEvent(new Event("visibilitychange")); },
  };
}

test("initial music is silent, local, looping, and not preloaded", () => {
  const f = fixture();
  try {
    assert.equal(f.audio.plays.length,0);
    assert.equal(f.audio.paused,true);
    assert.equal(f.audio.preload,"none");
    assert.equal(f.audio.loop,true);
    assert.equal(f.audio.src,"/audio/playful-joyful-audio.mp3");
    assert.equal(f.audio.volume,0);
    assert.deepEqual(f.states,["paused"]);
  } finally { f.controller.dispose(); }
});

test("envelope activation synchronously requests one play and fades to gentle volume", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope();
    assert.equal(f.audio.plays.length,1); // No await or promise callback is needed to request play.
    f.controller.startFromEnvelope();
    assert.equal(f.audio.plays.length,1);
    assert.equal(f.states.at(-1),"loading");
    f.audio.succeed(); await flush();
    assert.equal(f.states.at(-1),"playing");
    f.tick(0); f.tick(invitationMusic.fadeInMs);
    assert.equal(f.audio.volume,.23);
  } finally { f.controller.dispose(); }
});

test("rejected or synchronously throwing playback returns normally and never automatically retries", async () => {
  for (const throws of [false,true]) {
    const f = fixture(); f.audio.throwOnPlay = throws;
    try {
      assert.doesNotThrow(() => f.controller.startFromEnvelope());
      if (!throws) f.audio.plays[0].reject(new Error("blocked"));
      await flush();
      assert.equal(f.states.at(-1),"paused");
      assert.equal(f.audio.paused,true);
      const plays = f.audio.plays.length;
      f.controller.startFromEnvelope();
      assert.equal(f.audio.plays.length,plays);
    } finally { f.controller.dispose(); }
  }
});

test("toggle fades out then pauses, and resumes the same track without resetting its position", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope(); f.audio.succeed(); await flush();
    f.tick(0); f.tick(650); f.audio.currentTime = 42;
    f.controller.toggle(); f.tick(700); f.tick(880);
    assert.equal(f.audio.paused,true);
    assert.equal(f.audio.volume,0);
    assert.equal(f.states.at(-1),"paused");
    f.controller.toggle(); f.audio.succeed(); await flush();
    assert.equal(f.audio.plays.length,2);
    assert.equal(f.audio.currentTime,42);
    assert.equal(f.states.at(-1),"playing");
  } finally { f.controller.dispose(); }
});

test("Replay/envelope repeats preserve both playing and paused preferences", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope(); f.audio.succeed(); await flush(); f.audio.currentTime = 31;
    for (let i=0;i<4;i++) f.controller.startFromEnvelope();
    assert.equal(f.audio.plays.length,1);
    assert.equal(f.audio.currentTime,31);
    f.controller.toggle(); f.tick(0); f.tick(180);
    f.controller.startFromEnvelope();
    assert.equal(f.audio.plays.length,1);
    assert.equal(f.states.at(-1),"paused");
  } finally { f.controller.dispose(); }
});

test("rapid toggles discard stale promises and cancel outdated fades", async () => {
  const f = fixture();
  try {
    f.controller.toggle(); // Request 1.
    f.controller.toggle(); // Cancel while loading.
    f.controller.toggle(); // Request 2.
    f.audio.plays[0].reject(new Error("obsolete request")); await flush();
    f.audio.succeed(1); await flush();
    assert.equal(f.states.at(-1),"playing");
    f.tick(0); f.tick(650);
    f.controller.toggle(); f.tick(700);
    f.controller.toggle(); f.audio.succeed(2); await flush();
    f.tick(710); f.tick(1360);
    assert.equal(f.audio.paused,false);
    assert.equal(f.audio.volume,.23);
    f.controller.toggle(); f.tick(1400); f.tick(1580);
    f.audio.plays[1].resolve(); await flush();
    assert.equal(f.audio.paused,true);
    assert.equal(f.states.at(-1),"paused");
  } finally { f.controller.dispose(); }
});

test("backgrounding pauses immediately and resumes only previously playing audio", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope(); f.audio.succeed(); await flush(); f.audio.currentTime = 22;
    f.visibility(true); f.visibility(true);
    assert.equal(f.audio.paused,true);
    assert.equal(f.frames.size,0);
    f.visibility(false);
    assert.equal(f.audio.plays.length,2);
    assert.equal(f.audio.currentTime,22);
    f.audio.succeed(); await flush();
    assert.equal(f.states.at(-1),"playing");
  } finally { f.controller.dispose(); }
});

test("muted or still-loading audio stays paused on foreground return", async () => {
  for (const muted of [false,true]) {
    const f = fixture();
    try {
      f.controller.startFromEnvelope();
      if (muted) { f.audio.succeed(); await flush(); f.controller.toggle(); }
      f.visibility(true); f.visibility(false);
      assert.equal(f.audio.plays.length,1);
      assert.equal(f.states.at(-1),"paused");
      f.audio.plays[0].resolve(); await flush();
      assert.equal(f.audio.paused,true);
    } finally { f.controller.dispose(); }
  }
});

test("blocked foreground resumption remains paused until the user explicitly retries", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope(); f.audio.succeed(); await flush();
    f.visibility(true); f.visibility(false);
    f.audio.plays[1].reject(new Error("activation required")); await flush();
    f.visibility(true); f.visibility(false);
    f.controller.startFromEnvelope();
    assert.equal(f.audio.plays.length,2);
    assert.equal(f.states.at(-1),"paused");
    f.controller.toggle(); assert.equal(f.audio.plays.length,3);
    f.audio.succeed(); await flush(); assert.equal(f.states.at(-1),"playing");
  } finally { f.controller.dispose(); }
});

test("missing or undecodable audio fails gracefully without a playing indicator", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope();
    f.audio.dispatchEvent(new Event("error"));
    f.audio.plays[0].reject(new Error("decode failed")); await flush();
    assert.equal(f.states.at(-1),"paused");
    assert.equal(f.audio.paused,true);
    assert.equal(f.frames.size,0);
    f.controller.toggle(); assert.equal(f.audio.plays.length,2);
  } finally { f.controller.dispose(); }
});

test("cleanup stops pending/fading audio, aborts loading and removes every listener", async () => {
  const f = fixture();
  f.controller.startFromEnvelope(); f.audio.succeed(); await flush(); f.tick(0);
  f.controller.dispose();
  assert.equal(f.audio.paused,true);
  assert.equal(f.audio.src,"");
  assert.equal(f.audio.loads,1);
  assert.equal(f.frames.size,0);
  const count = f.states.length;
  f.visibility(true); f.visibility(false);
  f.audio.dispatchEvent(new Event("playing")); f.audio.dispatchEvent(new Event("error"));
  f.controller.toggle(); f.controller.startFromEnvelope(); f.controller.dispose();
  assert.equal(f.states.length,count);
  assert.equal(f.audio.plays.length,1);
});

test("Strict Mode-style disposal/remount cannot let an old promise pause a newer player", async () => {
  const f = fixture();
  f.controller.startFromEnvelope(); f.controller.dispose();
  const states = [];
  const next = createInvitationMusic(f.audio, status => states.push(status));
  try {
    next.startFromEnvelope(); f.audio.succeed(1); await flush();
    const pauses = f.audio.pauses;
    f.audio.plays[0].resolve(); await flush();
    assert.equal(f.audio.pauses,pauses);
    assert.equal(f.audio.paused,false);
    assert.equal(states.at(-1),"playing");
  } finally { next.dispose(); }
});

test("a queued pause event cannot cancel newer playback, while a real native pause can", async () => {
  const f = fixture();
  try {
    f.controller.startFromEnvelope(); f.audio.succeed(); await flush();
    f.controller.toggle(); f.tick(0); f.tick(180);
    f.controller.toggle();
    f.audio.dispatchEvent(new Event("pause")); // Queued from the preceding pause; audio is playing again.
    f.audio.succeed(); await flush();
    assert.equal(f.states.at(-1),"playing");
    f.audio.pause();
    assert.equal(f.states.at(-1),"paused");
    assert.equal(f.frames.size,0);
  } finally { f.controller.dispose(); }
});
