import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Execute the real controller against deterministic DOM/GSAP adapters. These tests exercise
// lifecycle/event behavior; browser QA separately verifies GSAP rendering and native scrolling.
const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const invitationUrl = moduleUrl(compile(await readFile(new URL("../app/lib/invitation.ts", import.meta.url), "utf8")));
let active;
const targets = (target) => Array.isArray(target) ? target : [target];
const apply = (target, values) => {
  for (const element of targets(target)) for (const [key, raw] of Object.entries(values)) {
    if (["duration", "ease", "delay", "onComplete", "onUpdate"].includes(key)) continue;
    const value = typeof raw === "function" ? raw() : raw;
    if (element.style) element.style[key] = value;
    else element[key] = value;
  }
};
const gsap = {
  context() {
    return { add(callback) { callback(); }, revert() { active.reversions += 1; active.card.style = style(); } };
  },
  set: apply,
  fromTo(target, from, to) { apply(target, from); active.bursts.push({ target, to }); },
  to(target, vars) { active.confettiCompletions.push(vars.onComplete); },
  timeline(options) {
    const actions = [];
    const instance = {
      actions, options, killed: false,
      addLabel(name, at) { active.labels[name] = at; return this; },
      to(target, vars, at) { actions.push({ at, duration: vars.duration, target, vars }); return this; },
      set(target, vars, at) { actions.push({ at, duration: 0, target, vars }); return this; },
      call(callback, args, at) { actions.push({ at, duration: 0, callback }); return this; },
      kill() { this.killed = true; },
      advance(time) {
        for (const action of [...actions].sort((a,b) => a.at-b.at)) {
          if (this.killed) break;
          if (!action.done && time >= action.at + action.duration) {
            action.done = true;
            if (action.callback) action.callback();
            else { apply(action.target, action.vars); action.vars.onUpdate?.(); }
          }
        }
        if (time >= 5.1 && !this.killed) options.onComplete();
      },
    };
    active.timelines.push(instance);
    return instance;
  },
};
globalThis.__invitationControllerTest = { gsap };
const source = compile(await readFile(new URL("../app/lib/invitation-controller.ts", import.meta.url), "utf8"))
  .replace('import { gsap } from "gsap";', 'const { gsap } = globalThis.__invitationControllerTest;')
  .replace('from "./invitation"', `from "${invitationUrl}"`);
const { createInvitationController } = await import(moduleUrl(source));
delete globalThis.__invitationControllerTest;

function style() {
  return { getPropertyValue(key) { return this[key] || ""; }, getPropertyPriority() { return ""; }, setProperty(key, value) { this[key] = value; }, removeProperty(key) { delete this[key]; if (key === "min-height") delete this.minHeight; } };
}
class ElementStub extends EventTarget {
  constructor(kind = "div") { super(); this.kind = kind; this.style = style(); this.dataset = {}; this.attributes = {}; this.children = []; this.clientWidth = 358; this.scrollHeight = 838; }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { if (key === "style") this.style = style(); else delete this.attributes[key]; }
  getBoundingClientRect() { const height = this.kind === "shell" ? 205 : Number.parseFloat(this.style.height ?? this.style.minHeight ?? 838); return { left:0, top:106-globalThis.window.scrollY, width:358, height, bottom:106-globalThis.window.scrollY+height }; }
  focus() { globalThis.document.activeElement = this; }
  closest(selector) {
    if (this.kind === "input" && selector.includes("input")) return this;
    if (this.kind === "button" && selector.includes("button")) return this;
    return null;
  }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  querySelector(selector) { return active.elements[selector]; }
  querySelectorAll() { return []; }
}
function fixture({ reduced = false, history = null, scrollY = 0, navigation = "navigate", hash = "", search = "" } = {}) {
  const elements = Object.fromEntries([".experience-stage", ".card-frame", "[data-envelope-shell]", "[data-envelope-flap]", "[data-envelope-seal]", "[data-open]", ".extras-wrapper", ".envelope-accessibility", "[data-confetti]", ".envelope-foliage-wrap", ".envelope-intro", ".envelope-cue"].map(key => [key, new ElementStub()]));
  elements["[data-envelope-shell]"].kind = "shell";
  elements["[data-open]"].kind = "button";
  const win = new EventTarget();
  Object.assign(win, { innerHeight:844, scrollY, location:{pathname:"/",search,hash}, performance:{getEntriesByType:() => [{type:navigation}]}, history:{state:history, replaceState(value, _, url) { this.state = value; if (url) { const parsed = new URL(url, "https://example.test"); Object.assign(win.location, {pathname:parsed.pathname,search:parsed.search,hash:parsed.hash}); } }}, scrollTo({top}) { this.scrollY = top; active.scrollWrites.push(top); } });
  const motion = new EventTarget(); motion.matches = reduced; win.matchMedia = () => motion;
  const doc = new EventTarget(); Object.assign(doc, { documentElement: new ElementStub(), activeElement:null, createElement:() => new ElementStub(), hidden:false });
  Object.assign(globalThis, { window:win, document:doc, Element:ElementStub, getComputedStyle:() => style(), requestAnimationFrame:callback => { const id = ++active.frameId; active.frames.set(id, callback); return id; }, cancelAnimationFrame:id => active.frames.delete(id) });
  active = { elements, card:elements[".card-frame"], timelines:[], bursts:[], confettiCompletions:[], reversions:0, labels:{}, scrollWrites:[], frames:new Map(), frameId:0, states:[] };
  const root = new ElementStub();
  const controller = createInvitationController(root, state => active.states.push(state));
  const dispatch = (target, type, values = {}) => { const event = new Event(type, {cancelable:true}); Object.assign(event, values); target.dispatchEvent(event); assert.equal(event.defaultPrevented, false); };
  return { controller, root, win, doc, motion, elements, dispatch, data:active, advance(time) { active.timelines.at(-1).advance(time); }, flushFrames() { const callbacks = [...active.frames.values()]; active.frames.clear(); callbacks.forEach(fn => fn()); } };
}

// Tests are intentionally sequential: browser globals are the adapter boundary.
test("automatic sequence holds the reveal, overlaps expansion/pan, and guards duplicate activation", () => {
  const f = fixture();
  try {
    f.controller.open(); f.controller.open();
    assert.equal(f.data.timelines.length, 1);
    f.advance(2);
    assert.equal(f.root.dataset.state, "reveal");
    assert.equal(f.data.bursts.length, 1);
    assert.equal(f.elements["[data-confetti]"].children.length, 20);
    f.advance(3.24); assert.equal(f.root.dataset.state, "reveal");
    f.advance(3.25); assert.equal(f.root.dataset.state, "expanding");
    assert.deepEqual(f.data.labels, {seal:0,extraction:.95,reveal:2,expand:3.25,pan:3.65,full:5.1});
    f.advance(5.1); assert.equal(f.root.dataset.state, "full");
    assert.equal(f.elements[".extras-wrapper"].inert, false);
    assert.equal(f.doc.documentElement.style.getPropertyValue("overflow-anchor"), "");
  } finally { f.controller.dispose(); }
});

test("scroll intent interrupts every phase without consuming the gesture or writing scroll", () => {
  for (const time of [0,2.5,3.35,3.65,4]) {
    for (const type of ["wheel","keydown"]) {
      const f = fixture();
      try {
        f.controller.open(); f.advance(time); f.win.scrollY = 157;
        f.dispatch(f.win, type, type === "wheel" ? {deltaX:0,deltaY:40} : {key:"PageDown"});
        assert.equal(f.root.dataset.state, "full");
        assert.equal(f.win.scrollY, 157);
        assert.equal(f.data.scrollWrites.length, 0);
        const count = f.data.states.length;
        f.advance(6);
        assert.equal(f.data.states.length, count);
      } finally { f.controller.dispose(); }
    }
  }
});

test("touch requires 10 CSS pixels and card presses begun during extraction cannot skip", () => {
  const f = fixture();
  try {
    f.controller.open();
    f.dispatch(f.win,"touchstart",{touches:[{clientX:20,clientY:20}]});
    f.dispatch(f.win,"touchmove",{touches:[{clientX:20,clientY:29}]});
    assert.equal(f.root.dataset.state,"opening");
    f.dispatch(f.data.card,"pointerdown");
    f.advance(2);
    f.dispatch(f.data.card,"click");
    assert.equal(f.root.dataset.state,"reveal");
    f.dispatch(f.win,"touchmove",{touches:[{clientX:20,clientY:30}]});
    assert.equal(f.root.dataset.state,"full");
  } finally { f.controller.dispose(); }
  const tap = fixture();
  try {
    tap.controller.open(); tap.advance(2);
    tap.dispatch(tap.data.card,"pointerdown"); tap.dispatch(tap.data.card,"click");
    assert.equal(tap.root.dataset.state,"full");
  } finally { tap.controller.dispose(); }
});

test("replay during every transition invalidates old callbacks and is deterministic", () => {
  for (const time of [0,2.5,3.5,4.5,5.1]) {
    const f = fixture();
    try {
      f.controller.open(); f.advance(time);
      const oldTimeline = f.data.timelines[0];
      const oldPanUpdate = oldTimeline.actions.find(action => action.vars?.onUpdate)?.vars.onUpdate;
      f.controller.replay(); f.flushFrames();
      oldTimeline.options.onComplete(); oldPanUpdate?.(); f.data.confettiCompletions.forEach(callback => callback?.());
      assert.equal(f.root.dataset.state,"closed");
      assert.equal(f.win.scrollY,0);
      assert.equal(f.doc.activeElement,f.elements["[data-open]"]);
      assert.equal(f.elements["[data-confetti]"].children.length,0);
      assert.equal(f.win.history.state.__zunainInvitation,undefined);
      f.controller.open(); f.advance(5.1); assert.equal(f.root.dataset.state,"full");
    } finally { f.controller.dispose(); }
  }
});

test("reduced motion and legacy history restore directly to the full accessible card", () => {
  for (const options of [{reduced:true},{history:{__NA:true,__zunainInvitation:"reveal"}},{history:{__NA:true,__zunainInvitation:"full"}},{scrollY:200}]) {
    const f = fixture(options);
    try {
      if (options.reduced) f.controller.open();
      assert.equal(f.root.dataset.state,"full");
      assert.equal(f.data.timelines.length,0);
      assert.equal(f.data.bursts.length,0);
      assert.equal(f.elements[".extras-wrapper"].hidden,false);
      assert.equal(f.data.card.attributes["aria-hidden"],"false");
      if (options.history) assert.equal(f.win.history.state.__NA,true);
    } finally { f.controller.dispose(); }
  }
});

test("reload resets saved scenes, scroll and invitation anchors while preserving router state and query", () => {
  for (const options of [
    { history:{__NA:true,__zunainInvitation:"full"} },
    { history:{__NA:true,__zunainInvitation:"reveal"} },
    { history:{__NA:true,__zunainInvitation:"full"}, scrollY:400 },
    { history:{__NA:true,__zunainInvitation:"full"}, scrollY:400, hash:"#invitation", search:"?guest=1" },
  ]) {
    const f = fixture({...options, navigation:"reload"});
    try {
      assert.equal(f.root.dataset.state,"closed");
      assert.equal(f.win.scrollY,0);
      assert.equal(f.win.location.hash,"");
      assert.equal(f.win.location.search,options.search ?? "");
      assert.deepEqual(f.win.history.state,{__NA:true});
      assert.equal(f.elements[".extras-wrapper"].hidden,true);
      assert.equal(f.data.card.attributes["aria-hidden"],"true");
    } finally { f.controller.dispose(); }
  }
});

test("direct invitation links and history navigation still restore the full card", () => {
  for (const options of [{hash:"#invitation"}, {navigation:"back_forward", history:{__NA:true,__zunainInvitation:"full"}, scrollY:200}]) {
    const f = fixture(options);
    try {
      assert.equal(f.root.dataset.state,"full");
      assert.equal(f.win.scrollY,options.scrollY ?? 0);
      assert.equal(f.elements[".extras-wrapper"].hidden,false);
    } finally { f.controller.dispose(); }
  }
});

test("backgrounding, motion changes and teardown recover without leaving listeners", () => {
  for (const recovery of ["background","motion","dispose"]) {
    const f = fixture(); f.controller.open(); f.advance(2);
    if (recovery === "background") { f.doc.hidden = true; f.dispatch(f.doc,"visibilitychange"); }
    if (recovery === "motion") f.dispatch(f.motion,"change");
    f.controller.dispose();
    const states = f.data.states.length;
    f.dispatch(f.win,"wheel",{deltaX:0,deltaY:10});
    f.dispatch(f.win,"resize");
    assert.equal(f.data.states.length,states);
    assert.equal(f.root.dataset.enhanced,"false");
    assert.equal(f.doc.documentElement.style.getPropertyValue("overflow-anchor"),"");
  }
});

test("a failure inside an asynchronous reveal callback exposes the full invitation", () => {
  const f = fixture();
  const original = gsap.fromTo;
  try {
    gsap.fromTo = () => { throw new Error("simulated animation failure"); };
    f.controller.open(); f.advance(2);
    assert.equal(f.root.dataset.state,"full");
    assert.equal(f.elements[".extras-wrapper"].hidden,false);
    assert.equal(f.elements["[data-confetti]"].children.length,0);
    assert.equal(f.doc.documentElement.style.getPropertyValue("overflow-anchor"),"");
  } finally { gsap.fromTo = original; f.controller.dispose(); }
});

test("the watchdog recovers a stalled opening, birthday hold, or expansion", () => {
  for (const time of [0,2.5,3.6]) {
    const f = fixture();
    const original = globalThis.setTimeout;
    let recover;
    try {
      globalThis.setTimeout = (callback, delay) => { recover = callback; return original(() => {}, delay); };
      f.controller.open();
      globalThis.setTimeout = original;
      f.advance(time);
      recover();
      assert.equal(f.root.dataset.state,"full");
      f.controller.replay(); recover();
      assert.equal(f.root.dataset.state,"closed");
    } finally { globalThis.setTimeout = original; f.controller.dispose(); }
  }
});
