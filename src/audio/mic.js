// Listening to the microphone for the hum: frames of samples go to the pitch
// detector, and steady notes come out. The browser asks for permission; with
// no microphone, `listen` rejects and the screen says so.

import { detectPitch, noteTracker } from './pitch.js';

export async function listen(onNote, { cents = 0 } = {}) {
  const media = globalThis.navigator?.mediaDevices;
  if (!media?.getUserMedia) throw new Error('no-microphone');
  const stream = await media.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ac = new AC();
  const src = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const track = noteTracker({ cents });
  let on = true;
  const tick = () => {
    if (!on) return;
    analyser.getFloatTimeDomainData(buf);
    const note = track(detectPitch(buf, ac.sampleRate));
    if (note) onNote(note);
    setTimeout(tick, 30);
  };
  tick();
  return () => {
    on = false;
    stream.getTracks().forEach((t) => t.stop());
    ac.close();
  };
}
