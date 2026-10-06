// Chiptune sound effects synthesised with WebAudio, so there are no audio
// files to load. Audio only starts after the first user gesture, as browsers
// require; whether effects play is a player setting.
import { getSettings } from '../ui/settings.js';

let ctx = null;

/** The page's single AudioContext, created on first use. */
export function audioContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { at = 0, dur = 0.08, type = 'square', gain = 0.05, slide = 0 } = {}) {
  if (!getSettings().sfx) return;
  const ac = audioContext();
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
  type() { tone(560 + Math.random() * 80, { dur: 0.03, gain: 0.014 }); },
  move() { tone(440, { dur: 0.04, gain: 0.025 }); },
  select() { tone(660, { dur: 0.06 }); tone(990, { at: 0.06, dur: 0.08 }); },
  back() { tone(520, { dur: 0.05 }); tone(390, { at: 0.05, dur: 0.07 }); },
  step() { tone(110 + Math.random() * 30, { dur: 0.03, type: 'triangle', gain: 0.035 }); },
  good() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.1 })); },
  bad() { tone(220, { dur: 0.25, type: 'sawtooth', gain: 0.04, slide: -110 }); },
  neutral() { tone(523, { dur: 0.08, type: 'triangle' }); },
  chime() { [784, 988, 1175].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.3, type: 'triangle', gain: 0.04 })); },
  /** An alarm clock, a cockpit master alarm, a horn: three urgent beeps. */
  alarm() { [0, 0.16, 0.32].forEach(at => tone(1320, { at, dur: 0.1, gain: 0.05 })); },
  end(good) {
    const notes = good ? [392, 523, 659, 784, 1047] : [392, 349, 311, 262];
    notes.forEach((f, i) => tone(f, { at: i * 0.14, dur: 0.22, type: 'triangle', gain: 0.07 }));
  },
};
