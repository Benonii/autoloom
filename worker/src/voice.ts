import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

import { environment } from '@worker/environment';

import type { Narration } from '@worker/types';

const sampleRate = 24_000;
const bytesPerSample = 2;
const wordsPerSecond = 2.6;
const client = environment.openAIKey ? new OpenAI({ apiKey: environment.openAIKey }) : null;

function wrapInWave(pcm: Uint8Array): Uint8Array {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.byteLength, 40);
  return Buffer.concat([header, pcm]);
}

function estimateReadingSeconds(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return wordCount / wordsPerSecond + 0.6;
}

async function speak(text: string, voiceID: string, filePath: string): Promise<number> {
  if (!client) throw new Error('OPENAI_API_KEY is not set in worker/.env');
  const response = await client.audio.speech.create({
    model: environment.speechModel,
    voice: voiceID,
    input: text,
    instructions: 'Friendly, clear product walkthrough narrator. Natural pace.',
    response_format: 'pcm'
  });
  const pcm = new Uint8Array(await response.arrayBuffer());
  await writeFile(filePath, wrapInWave(pcm));
  return pcm.byteLength / (sampleRate * bytesPerSample);
}

export async function narrate(
  texts: string[],
  voiceoverEnabled: boolean,
  voiceID: string,
  directory: string
): Promise<Narration[]> {
  return Promise.all(
    texts.map(async (text, stepIndex) => {
      if (!voiceoverEnabled) {
        return { stepIndex, text, audioPath: null, durationSeconds: estimateReadingSeconds(text) };
      }
      const audioPath = path.join(directory, `voice-${stepIndex}.wav`);
      const durationSeconds = await speak(text, voiceID, audioPath);
      return { stepIndex, text, audioPath, durationSeconds };
    })
  );
}
