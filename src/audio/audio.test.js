import { describe, it, expect } from 'vitest';
import { voicing, timeline, midiToFreq } from './voicing.js';
import { detectPitch, pitchClassOf, noteTracker } from './pitch.js';

const pcs = (ms) => ms.map((m) => m % 12);

describe('voicing', () => {
  it('puts the bass in the guitar’s low register and the chord above it', () => {
    const v = voicing('Dm');
    expect(v[0]).toBe(50); // D3
    expect(pcs(v.slice(1)).sort()).toEqual([2, 5, 9]);
    expect(v.slice(1).every((m) => m >= 55 && m < 67)).toBe(true);
  });

  it('follows a written bass, so an inversion moves the bass line', () => {
    expect(voicing('E7/B')[0] % 12).toBe(11);
    expect(voicing('D7/F#')[0]).toBe(42); // F#2
  });

  it('leaves out the fifth of a five-note chord', () => {
    const v = voicing('A7(b13)');
    expect(v).toHaveLength(5);
    expect(pcs(v.slice(1))).not.toContain(4);
  });

  it('sounds nothing for no chord', () => {
    expect(voicing('NC')).toEqual([]);
  });

  it('turns MIDI into frequency', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(57)).toBeCloseTo(220);
  });
});

describe('the timeline', () => {
  it('plays each chord for its length, in the violão’s pattern', () => {
    const { notes, length } = timeline([{ sym: 'Dm', d: 0.5 }, { sym: 'A7', d: 0.25 }, { sym: 'Dm', d: 0.25 }], { barSeconds: 2 });
    expect(length).toBeCloseTo(4);
    const basses = notes.filter((n) => n.midi < 52).map((n) => [n.time, n.midi]);
    // A whole bar of Dm: bass D on beat 1, its fifth A on beat 2; then A7, then Dm.
    expect(basses).toEqual([[0, 50], [1, 45], [2, 45], [3, 50]]);
  });

  it('repeats the chord before for a held bar', () => {
    const { notes } = timeline([{ sym: 'A7', d: 0.5 }, { sym: '%', d: 0.5 }], { barSeconds: 1 });
    expect(notes.filter((n) => n.midi === 45 && n.time >= 1).length).toBeGreaterThan(0);
  });
});

describe('pitch detection', () => {
  const tone = (freq, sampleRate = 44100, n = 2048, harmonics = [1, 0.5, 0.25]) => {
    const b = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      b[i] = harmonics.reduce((a, amp, h) => a + amp * Math.sin((2 * Math.PI * freq * (h + 1) * i) / sampleRate), 0) * 0.3;
    }
    return b;
  };

  it('finds the pitch of a sung note, harmonics and all', () => {
    for (const f of [110, 196, 261.63, 440, 659.25]) {
      const r = detectPitch(tone(f), 44100);
      expect(r.freq, `${f} Hz`).toBeCloseTo(f, 0);
      expect(r.clarity).toBeGreaterThan(0.9);
    }
  });

  it('hears nothing in silence', () => {
    expect(detectPitch(new Float32Array(2048), 44100)).toBeNull();
  });

  it('names the pitch class, allowing for a recording off concert pitch', () => {
    expect(pitchClassOf(440).pc).toBe(9);
    expect(pitchClassOf(277.18).pc).toBe(1);
    // A recording 40 cents sharp: 440 Hz there is still an A.
    expect(pitchClassOf(440 * 2 ** (40 / 1200), 40).pc).toBe(9);
    expect(pitchClassOf(440 * 2 ** (60 / 1200), 0).pc).toBe(10);
  });

  it('enters a note once it holds steady, and again only after a change or silence', () => {
    const track = noteTracker({ holdFrames: 3 });
    const a = { freq: 440, clarity: 0.95 };
    const out = [a, a, a, a, a, null, a, a, a, { freq: 493.88, clarity: 0.95 }, { freq: 493.88, clarity: 0.95 }, { freq: 493.88, clarity: 0.95 }].map(track);
    expect(out.filter(Boolean).map((n) => n.pc)).toEqual([9, 9, 11]);
  });
});
