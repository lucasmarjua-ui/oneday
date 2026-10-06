// Generative chiptune music: each era has its own mode, tempo and chord
// progression, and a small sequencer plays bass, arpeggio and pad from them.
// Night makes it darker and quieter. Nothing is pre-recorded.
import { audioContext } from './sfx.js';
import { getSettings, onSettingsChange } from '../ui/settings.js';

const THEMES = {
  title: { tempo: 92, root: 60, scale: [0, 2, 4, 7, 9], progression: [0, 3, 4, 2], lead: 'square' },
  'apollo-11': { tempo: 70, root: 57, scale: [0, 2, 4, 6, 7, 9, 11], progression: [0, 4, 5, 3], lead: 'sine' },
  tenochtitlan: { tempo: 88, root: 62, scale: [0, 3, 5, 7, 10], progression: [0, 2, 3, 0], lead: 'triangle', drums: true },
  'd-day': { tempo: 76, root: 57, scale: [0, 2, 3, 5, 7, 8, 10], progression: [0, 5, 3, 4], lead: 'square' },
  giza: { tempo: 84, root: 62, scale: [0, 1, 4, 5, 7, 8, 10], progression: [0, 1, 6, 0], lead: 'triangle', drums: true },
};

const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const midi = n => 440 * 2 ** ((n - 69) / 12);

let theme = THEMES.title;
let master = null;
let filter = null;
let timer = null;
let step = 0;
let nextTime = 0;
let night = 0;
let wanted = false;

function noteOf(degree, octave = 0) {
  const { scale, root } = theme;
  const len = scale.length;
  const wrapped = ((degree % len) + len) % len;
  return root + scale[wrapped] + 12 * (octave + Math.floor(degree / len));
}

function voice(ac, freq, at, dur, type, gain) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + Math.min(0.02, dur / 4));
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp).connect(filter);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function hat(ac, at, gain) {
  const length = Math.floor(ac.sampleRate * 0.04);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ac.createBufferSource();
  const amp = ac.createGain();
  src.buffer = buffer;
  amp.gain.value = gain;
  src.connect(amp).connect(filter);
  src.start(at);
}

function schedule() {
  const ac = audioContext();
  if (!ac) return;
  const eighth = 60 / theme.tempo / 2;
  while (nextTime < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % theme.progression.length;
    const chord = theme.progression[bar];
    const beat = step % 8;
    const dim = 1 - night * 0.5;
    // Arpeggio over the bar's chord.
    voice(ac, midi(noteOf(chord + ARP[beat] * 2, 1)), nextTime, eighth * 0.9, theme.lead, 0.05 * dim);
    // Bass on beats one and three.
    if (beat === 0 || beat === 4) voice(ac, midi(noteOf(chord, -1)), nextTime, eighth * 3.6, 'triangle', 0.11);
    // A soft pad at the top of every bar.
    if (beat === 0) [0, 2, 4].forEach(i => voice(ac, midi(noteOf(chord + i, 0)), nextTime, eighth * 7.6, 'sine', 0.025));
    if (theme.drums && beat % 2 === 1) hat(ac, nextTime, 0.03 * dim);
    nextTime += eighth;
    step += 1;
  }
}

function start() {
  const ac = audioContext();
  if (!ac || timer) return;
  if (!master) {
    master = ac.createGain();
    filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.connect(master).connect(ac.destination);
  }
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.linearRampToValueAtTime(0.55, ac.currentTime + 1.5);
  filter.frequency.value = 5200 - night * 3600;
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(schedule, 80);
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  const ac = audioContext();
  if (ac && master) master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.4);
}

export const music = {
  /** Ask for music; it starts on the first click or key press if the setting allows. */
  play(themeName = 'title') {
    theme = THEMES[themeName] || THEMES.title;
    step = 0;
    wanted = true;
    const kick = () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      if (wanted && getSettings().music) start();
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
  },
  setNight(value) {
    night = value;
    if (filter) filter.frequency.value = 5200 - night * 3600;
  },
  stop,
};

onSettingsChange(settings => {
  if (settings.music && wanted) start();
  else stop();
});
