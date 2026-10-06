// Chiptune sound effects synthesised with WebAudio, so there are no audio
// files to load. Muted state is remembered; audio only starts after the first
// user gesture, as browsers require.
const MUTE_KEY = 'oneday.muted';

let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // Storage unavailable: start unmuted and just don't remember.
}

function audio() {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { at = 0, dur = 0.08, type = 'square', gain = 0.05, slide = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, start + dur);
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export const sfx = {
  type() { tone(560 + Math.random() * 80, { dur: 0.03, gain: 0.018 }); },
  move() { tone(440, { dur: 0.05, gain: 0.03 }); },
  select() { tone(660, { dur: 0.06 }); tone(990, { at: 0.06, dur: 0.08 }); },
  step() { tone(140, { dur: 0.04, type: 'triangle', gain: 0.04 }); },
  good() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.1 })); },
  bad() { tone(220, { dur: 0.25, type: 'sawtooth', gain: 0.04, slide: -110 }); },
  neutral() { tone(523, { dur: 0.08, type: 'triangle' }); },
  end(good) {
    const notes = good ? [392, 523, 659, 784, 1047] : [392, 349, 311, 262];
    notes.forEach((f, i) => tone(f, { at: i * 0.14, dur: 0.22, type: 'triangle', gain: 0.07 }));
  },
};

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = !!value;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore: the setting just won't persist.
  }
}
