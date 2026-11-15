// Pitch detection of one sung note (design §5: "pitch detection of one sung
// note is reliable"), with the YIN method (de Cheveigné & Kawahara, 2002).
// Pure: it reads a buffer of samples, so it is tested on generated tones.

const THRESHOLD = 0.12;
const MIN_FREQ = 70;
const MAX_FREQ = 1100;

/**
 * @param buffer Float32Array of samples
 * @returns {{ freq: number, clarity: number } | null} null in silence or noise
 */
export function detectPitch(buffer, sampleRate) {
  const n = buffer.length;
  let energy = 0;
  for (let i = 0; i < n; i += 1) energy += buffer[i] * buffer[i];
  if (Math.sqrt(energy / n) < 0.01) return null;
  const maxTau = Math.min(Math.floor(sampleRate / MIN_FREQ), Math.floor(n / 2));
  const minTau = Math.floor(sampleRate / MAX_FREQ);
  const d = new Float32Array(maxTau + 1);
  const window = n - maxTau;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let i = 0; i < window; i += 1) {
      const diff = buffer[i] - buffer[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  // Cumulative mean normalised difference.
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    running += d[tau];
    cmnd[tau] = running ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = Math.max(2, minTau); t <= maxTau; t += 1) {
    if (cmnd[t] < THRESHOLD) {
      while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t += 1;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // Parabolic interpolation around the minimum.
  const a = cmnd[tau - 1];
  const b = cmnd[tau];
  const c = tau + 1 <= maxTau ? cmnd[tau + 1] : b;
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0;
  const period = tau + (Number.isFinite(shift) ? shift : 0);
  return { freq: sampleRate / period, clarity: 1 - b };
}

/** The pitch class of a frequency, allowing for a recording `cents` off concert pitch. */
export function pitchClassOf(freq, cents = 0) {
  const midi = 69 + 12 * Math.log2(freq / 440) - cents / 100;
  return { pc: ((Math.round(midi) % 12) + 12) % 12, midi: Math.round(midi), off: midi - Math.round(midi) };
}

/**
 * Turns a stream of detections into notes: a note is entered once it has held
 * steady for `holdFrames` frames, and again only after silence or a change.
 */
export function noteTracker({ holdFrames = 6, cents = 0 } = {}) {
  let last = null;
  let run = 0;
  let entered = null;
  return (detection) => {
    if (!detection || detection.clarity < 0.85) {
      last = null;
      run = 0;
      entered = null;
      return null;
    }
    const { midi } = pitchClassOf(detection.freq, cents);
    if (midi === last) run += 1;
    else { last = midi; run = 1; }
    if (run >= holdFrames && entered !== midi) {
      entered = midi;
      return pitchClassOf(detection.freq, cents);
    }
    return null;
  };
}
