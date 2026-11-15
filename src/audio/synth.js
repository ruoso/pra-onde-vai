// The sound: a plucked string, synthesised (a sampled nylon guitar is an open
// decision, docs/implementation-plan.md). It plays a timeline from voicing.js
// through Web Audio; with no audio the app works silently.

import { midiToFreq, timeline } from './voicing.js';

let ctx = null;
let master = null;
let detuneCents = 0;
let playing = [];

function context() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    master.connect(lp);
    lp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Recordings not at concert pitch: everything sounds this many cents off. */
export function setDetune(cents) {
  detuneCents = cents;
}

/** Stop whatever is sounding. */
export function stop() {
  for (const n of playing) {
    try { n.stop(); } catch { /* already stopped */ }
  }
  playing = [];
}

function pluck(ac, note, t0) {
  const at = t0 + note.time;
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = midiToFreq(note.midi);
  osc.detune.value = detuneCents;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(note.gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(note.gain * 0.35, at + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(note.length + 0.4, 2.4));
  osc.connect(g);
  g.connect(master);
  osc.start(at);
  osc.stop(at + Math.min(note.length + 0.5, 2.5));
  playing.push(osc);
  osc.onended = () => { playing = playing.filter((x) => x !== osc); };
}

/**
 * Play chords in time, stopping anything still sounding. Resolves when the
 * last chord has sounded its length.
 * @param chords [{ sym, d }]
 */
export function playChords(chords, options = {}) {
  const ac = context();
  if (!ac || !chords.length) return Promise.resolve();
  stop();
  const { notes, length } = timeline(chords, options);
  const t0 = ac.currentTime + 0.03;
  for (const n of notes) pluck(ac, n, t0);
  return new Promise((resolve) => setTimeout(resolve, length * 1000));
}

/** Play single notes (MIDI), e.g. the notes entered on the listening screen. */
export function playNotes(notes) {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + 0.02;
  for (const n of notes) pluck(ac, { gain: 0.35, length: 0.6, ...n }, t0);
}
