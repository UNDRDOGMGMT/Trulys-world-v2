import { Howl } from 'howler';

// Synthesize short SFX as base64 data URIs to avoid needing external audio files.
// These are tiny WAV files generated inline.

// Helper: create a WAV from raw PCM samples (mono, 44100 Hz, 16-bit)
function createWav(samples: Float32Array): string {
  const sampleRate = 44100;
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Generate a short click/snap sound (paper folder slap)
function generateClick(): string {
  const rate = 44100;
  const duration = 0.08;
  const samples = new Float32Array(Math.floor(rate * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 60);
    samples[i] = env * (Math.random() * 2 - 1) * 0.5;
  }
  return createWav(samples);
}

// Generate a soft shutter/collect sound
function generateCollect(): string {
  const rate = 44100;
  const duration = 0.25;
  const samples = new Float32Array(Math.floor(rate * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 12);
    const freq = 800 - t * 1500;
    samples[i] = env * Math.sin(2 * Math.PI * freq * t) * 0.3;
  }
  return createWav(samples);
}

// Generate a low ambient hum loop
function generateAmbient(): string {
  const rate = 44100;
  const duration = 4; // 4-second loop
  const samples = new Float32Array(Math.floor(rate * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    // Low hum with slow modulation
    const hum = Math.sin(2 * Math.PI * 60 * t) * 0.02;
    const mod = Math.sin(2 * Math.PI * 0.3 * t) * 0.01;
    // Subtle noise bed
    const noise = (Math.random() * 2 - 1) * 0.008;
    samples[i] = hum + mod + noise;
  }
  return createWav(samples);
}

// Lazy-initialized sound instances
let clickSound: Howl | null = null;
let collectSound: Howl | null = null;
let ambientSound: Howl | null = null;

export function playClick() {
  if (!clickSound) {
    clickSound = new Howl({ src: [generateClick()], volume: 0.4 });
  }
  clickSound.play();
}

export function playCollect() {
  if (!collectSound) {
    collectSound = new Howl({ src: [generateCollect()], volume: 0.5 });
  }
  collectSound.play();
}

export function startAmbient() {
  if (!ambientSound) {
    ambientSound = new Howl({
      src: [generateAmbient()],
      volume: 0.15,
      loop: true,
    });
  }
  if (!ambientSound.playing()) {
    ambientSound.play();
  }
}

export function stopAmbient() {
  if (ambientSound && ambientSound.playing()) {
    ambientSound.fade(ambientSound.volume(), 0, 500);
    setTimeout(() => ambientSound?.stop(), 500);
  }
}

export function setAmbientVolume(vol: number) {
  ambientSound?.volume(vol);
}
