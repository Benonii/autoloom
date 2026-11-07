import { writeFile } from 'node:fs/promises';

const sampleRate = 44_100;
const beatSeconds = 0.5;
const chordProgression = [
  [110, 164.81, 220, 261.63],
  [87.31, 130.81, 174.61, 220],
  [130.81, 196, 261.63, 329.63],
  [98, 146.83, 196, 246.94]
];

interface MusicTimeline {
  introSeconds: number;
  sceneSeconds: number;
  sceneCount: number;
  outroSeconds: number;
}

function createNoise(): () => number {
  let seed = 7;
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 1_073_741_824 - 1;
  };
}

function addSample(samples: Float32Array, index: number, value: number): void {
  samples[index] = (samples[index] ?? 0) + value;
}

function addKick(samples: Float32Array, startSeconds: number, gain: number, lengthSeconds: number): void {
  const startIndex = Math.round(startSeconds * sampleRate);
  const length = Math.round(lengthSeconds * sampleRate);
  let phase = 0;
  for (let offset = 0; offset < length && startIndex + offset < samples.length; offset += 1) {
    const time = offset / sampleRate;
    const frequency = 42 + 110 * Math.exp(-time * 28);
    phase += (2 * Math.PI * frequency) / sampleRate;
    addSample(samples, startIndex + offset, Math.sin(phase) * Math.exp(-time / (lengthSeconds / 4)) * gain);
  }
}

function addNoiseBurst(
  samples: Float32Array,
  startSeconds: number,
  gain: number,
  lengthSeconds: number,
  noise: () => number
): void {
  const startIndex = Math.round(startSeconds * sampleRate);
  const length = Math.round(lengthSeconds * sampleRate);
  let previous = 0;
  for (let offset = 0; offset < length && startIndex + offset < samples.length; offset += 1) {
    const value = noise();
    const highPassed = value - previous;
    previous = value;
    addSample(samples, startIndex + offset, highPassed * Math.exp(-(offset / length) * 6) * gain);
  }
}

function addRiser(samples: Float32Array, endSeconds: number, lengthSeconds: number, noise: () => number): void {
  const startSeconds = Math.max(0, endSeconds - lengthSeconds);
  const startIndex = Math.round(startSeconds * sampleRate);
  const length = Math.round((endSeconds - startSeconds) * sampleRate);
  let phase = 0;
  for (let offset = 0; offset < length; offset += 1) {
    const progress = offset / length;
    phase += (2 * Math.PI * (200 + 900 * progress * progress)) / sampleRate;
    const swell = progress ** 2.5;
    addSample(samples, startIndex + offset, (noise() * 0.12 + Math.sin(phase) * 0.05) * swell);
  }
}

function addPad(samples: Float32Array, startSeconds: number, endSeconds: number, chord: number[], gain: number): void {
  const startIndex = Math.round(startSeconds * sampleRate);
  const endIndex = Math.min(samples.length, Math.round(endSeconds * sampleRate));
  const length = endIndex - startIndex;
  for (let offset = 0; offset < length; offset += 1) {
    const time = offset / sampleRate;
    const envelope = Math.min(1, time / 0.15) * Math.min(1, (length - offset) / (0.2 * sampleRate));
    let value = 0;
    for (const frequency of chord) {
      value += Math.sin(2 * Math.PI * frequency * time) + 0.3 * Math.sin(2 * Math.PI * frequency * 2.003 * time);
    }
    addSample(samples, startIndex + offset, (value / chord.length) * envelope * gain);
  }
}

function toWAV(samples: Float32Array): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.round(Math.tanh(sample * 1.4) * 0.85 * 32_767), 44 + index * 2);
  });
  return buffer;
}

export async function writeLaunchMusic(filePath: string, timeline: MusicTimeline): Promise<void> {
  const scenesEndSeconds = timeline.introSeconds + timeline.sceneCount * timeline.sceneSeconds;
  const totalSeconds = scenesEndSeconds + timeline.outroSeconds;
  const samples = new Float32Array(Math.ceil(totalSeconds * sampleRate));
  const noise = createNoise();
  addPad(samples, 0, timeline.introSeconds, chordProgression[0] ?? [], 0.08);
  addRiser(samples, timeline.introSeconds, timeline.introSeconds, noise);
  for (let sceneIndex = 0; sceneIndex < timeline.sceneCount; sceneIndex += 1) {
    const sceneStart = timeline.introSeconds + sceneIndex * timeline.sceneSeconds;
    const chord = chordProgression[sceneIndex % chordProgression.length] ?? [];
    addPad(samples, sceneStart, sceneStart + timeline.sceneSeconds, chord, 0.11);
    addKick(samples, sceneStart, 0.9, 0.9);
    addNoiseBurst(samples, sceneStart, 0.35, 0.35, noise);
    for (let beat = beatSeconds; beat < timeline.sceneSeconds - 0.01; beat += beatSeconds) {
      addKick(samples, sceneStart + beat, 0.6, 0.3);
    }
    for (let beat = beatSeconds / 2; beat < timeline.sceneSeconds; beat += beatSeconds) {
      addNoiseBurst(samples, sceneStart + beat, 0.08, 0.05, noise);
    }
    if (sceneIndex === timeline.sceneCount - 1) addRiser(samples, scenesEndSeconds, 1, noise);
  }
  addKick(samples, scenesEndSeconds, 1, 1.6);
  addNoiseBurst(samples, scenesEndSeconds, 0.4, 0.8, noise);
  addPad(samples, scenesEndSeconds, totalSeconds, chordProgression[0] ?? [], 0.1);
  await writeFile(filePath, toWAV(samples));
}
