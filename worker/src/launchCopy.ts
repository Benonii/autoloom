import OpenAI from 'openai';
import { z } from 'zod';

import { environment } from '@worker/environment';
import { readFirstJSONObject, readFirstOutputText } from '@worker/planner';

import type { LaunchCopy, PlannedStep } from '@worker/types';

const maximumScenes = 5;

const copySchema = z.object({
  headline: z.string(),
  closingLine: z.string(),
  scenes: z.array(z.object({ stepNumber: z.number(), caption: z.string() }))
});

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'closingLine', 'scenes'],
  properties: {
    headline: { type: 'string' },
    closingLine: { type: 'string' },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['stepNumber', 'caption'],
        properties: { stepNumber: { type: 'integer' }, caption: { type: 'string' } }
      }
    }
  }
} as const;

const instructions = `You write the on-screen text for a 15 second cinematic product launch trailer cut from a screen recording.
- headline: 2 to 6 words, a bold promise about what the product lets you do. No product name, no punctuation at the end.
- scenes: pick 3 to 5 of the numbered steps that look most impressive on screen, in order, always ending with the step that shows the result. caption: 1 to 4 punchy words for that moment, like "Pick a customer" or "Sent. Instantly".
- closingLine: 2 to 6 words that invite the viewer to try it.
Plain words, no emojis, no hashtags, no exclamation marks.`;

const danglingWords = new Set(['a', 'an', 'and', 'the', 'to', 'for', 'of', 'with', 'in', 'on', 'your']);

function cleanText(text: string, maximumWords: number): string {
  const words = text.replace(/[!#]/g, '').trim().split(/\s+/).slice(0, maximumWords);
  while (words.length > 1 && danglingWords.has((words.at(-1) ?? '').toLowerCase())) words.pop();
  return words.join(' ');
}

export function buildFallbackCopy(goal: string, steps: PlannedStep[]): LaunchCopy {
  const pickedIndexes = new Set<number>();
  const lastIndex = steps.length - 1;
  const stride = Math.max(1, Math.floor(steps.length / (maximumScenes - 1)));
  for (let index = Math.min(2, lastIndex); index < lastIndex && pickedIndexes.size < maximumScenes - 1; index += stride)
    pickedIndexes.add(index);
  if (lastIndex >= 0) pickedIndexes.add(lastIndex);
  const headline =
    goal
      .replace(/^show (me )?how to /i, '')
      .replace(/\.$/, '')
      .split(/ (?:to|for|with) /)[0] ?? goal;
  return {
    headline: cleanText(headline.charAt(0).toUpperCase() + headline.slice(1), 6),
    closingLine: 'Try it today',
    scenes: [...pickedIndexes].map((stepIndex) => ({ stepIndex, caption: cleanText(steps[stepIndex]?.title ?? '', 4) }))
  };
}

export async function writeLaunchCopy(goal: string, steps: PlannedStep[]): Promise<LaunchCopy> {
  const fallback = buildFallbackCopy(goal, steps);
  if (!environment.openAIKey) return fallback;
  try {
    const client = new OpenAI({ apiKey: environment.openAIKey });
    const stepList = steps.map((step, index) => `${index + 1}. ${step.title}: ${step.narration}`).join('\n');
    const response = await client.responses.create({
      model: environment.plannerModel,
      instructions,
      input: `Goal of the recording: ${goal}\n\nSteps:\n${stepList}`,
      text: { format: { type: 'json_schema', name: 'launch_copy', strict: true, schema: jsonSchema } }
    });
    const copy = copySchema.parse(JSON.parse(readFirstJSONObject(readFirstOutputText(response))));
    const scenes = copy.scenes
      .map((scene) => ({ stepIndex: scene.stepNumber - 1, caption: cleanText(scene.caption, 5) }))
      .filter((scene) => scene.stepIndex >= 0 && scene.stepIndex < steps.length && scene.caption)
      .sort((first, second) => first.stepIndex - second.stepIndex)
      .slice(0, maximumScenes);
    if (scenes.length < 2 || !copy.headline.trim()) return fallback;
    return {
      headline: cleanText(copy.headline, 7),
      closingLine: cleanText(copy.closingLine, 7) || fallback.closingLine,
      scenes
    };
  } catch (error) {
    console.error('Launch copy fell back to step titles', error);
    return fallback;
  }
}
