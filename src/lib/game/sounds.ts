let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio() {
  const ac = audio();
  if (ac && ac.state === "suspended") void ac.resume();
}

function tone(
  ac: AudioContext,
  freq: number,
  duration: number,
  when = 0,
  type: OscillatorType = "sine",
  gain = 0.07,
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + duration + 0.02);
}

export function playAdd() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 520, 0.09, 0, "triangle", 0.05);
}

export function playSafeSeven() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 392, 0.1, 0, "triangle", 0.06);
  tone(ac, 523, 0.14, 0.08, "triangle", 0.05);
}

export function playDouble() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 440, 0.1, 0, "square", 0.035);
  tone(ac, 660, 0.16, 0.09, "square", 0.03);
}

export function playBust() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 220, 0.22, 0, "sawtooth", 0.04);
  tone(ac, 130, 0.32, 0.06, "sawtooth", 0.045);
}

export function playBank() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 330, 0.08, 0, "triangle", 0.05);
  tone(ac, 494, 0.12, 0.07, "triangle", 0.05);
  tone(ac, 660, 0.16, 0.14, "triangle", 0.04);
}

export function playWin() {
  const ac = audio();
  if (!ac) return;
  tone(ac, 392, 0.14, 0, "triangle", 0.05);
  tone(ac, 494, 0.14, 0.12, "triangle", 0.05);
  tone(ac, 587, 0.18, 0.24, "triangle", 0.05);
  tone(ac, 784, 0.28, 0.38, "triangle", 0.045);
}

export function playRoll() {
  const ac = audio();
  if (!ac) return;
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.18, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const g = ac.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 1400;
  g.gain.value = 0.18;
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start();
}
