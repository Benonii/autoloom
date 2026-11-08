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

const elevenLabsVoices: Record<string, string> = {
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  charlie: 'IKne3meq5aSn9XLyUdCD'
};

const openAIVoices: Record<string, string> = { sarah: 'coral', george: 'ash', charlie: 'verse' };

async function speakWithElevenLabs(text: string, voiceID: string): Promise<Uint8Array> {
  const elevenLabsVoiceID = elevenLabsVoices[voiceID] ?? elevenLabsVoices.sarah;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceID}?output_format=pcm_24000`,
    {
      method: 'POST',
      headers: { 'xi-api-key': environment.elevenLabsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: environment.elevenLabsModel,
        voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true }
      })
    }
  );
  if (!response.ok)
    throw new Error(`ElevenLabs voiceover failed (${response.status}): ${(await response.text()).slice(0, 160)}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function speakWithOpenAI(text: string, voiceID: string): Promise<Uint8Array> {
  if (!client) throw new Error('Set ELEVENLABS_API_KEY or OPENAI_API_KEY in worker/.env');
  const response = await client.audio.speech.create({
    model: environment.speechModel,
    voice: openAIVoices[voiceID] ?? voiceID,
    input: text,
    instructions:
      'Upbeat, playful, friendly product demo host talking to a friend. Smile in your voice, vary your pitch, natural conversational pace. Never flat or robotic.',
    response_format: 'pcm'
  });
  return new Uint8Array(await response.arrayBuffer());
}

type Speaker = (text: string, voiceID: string) => Promise<Uint8Array>;

async function speak(speaker: Speaker, text: string, voiceID: string, filePath: string): Promise<number> {
  const pcm = await speaker(text, voiceID);
  await writeFile(filePath, wrapInWave(pcm));
  return pcm.byteLength / (sampleRate * bytesPerSample);
}

async function narrateWith(
  speaker: Speaker,
  texts: string[],
  voiceID: string,
  directory: string
): Promise<Narration[]> {
  const narrations: Narration[] = [];
  for (const [stepIndex, text] of texts.entries()) {
    const audioPath = path.join(directory, `voice-${stepIndex}.wav`);
    const durationSeconds = await speak(speaker, text, voiceID, audioPath);
    narrations.push({ stepIndex, text, audioPath, durationSeconds });
  }
  return narrations;
}

export async function narrate(
  texts: string[],
  voiceoverEnabled: boolean,
  voiceID: string,
  directory: string
): Promise<Narration[]> {
  if (!voiceoverEnabled) {
    return texts.map((text, stepIndex) => ({
      stepIndex,
      text,
      audioPath: null,
      durationSeconds: estimateReadingSeconds(text)
    }));
  }
  if (!environment.elevenLabsKey) return narrateWith(speakWithOpenAI, texts, voiceID, directory);
  try {
    return await narrateWith(speakWithElevenLabs, texts, voiceID, directory);
  } catch (error) {
    if (!client) throw error;
    console.warn('ElevenLabs failed, using OpenAI voices for this video', error);
    return narrateWith(speakWithOpenAI, texts, voiceID, directory);
  }
}
