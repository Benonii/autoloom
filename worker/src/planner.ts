import OpenAI from 'openai';
import { z } from 'zod';

import { environment } from '@worker/environment';

import type { PlannedStep, PlannerDecision } from '@worker/types';

const decisionSchema = z.object({
  status: z.enum(['act', 'done', 'stuck']),
  stepTitle: z.string(),
  narration: z.string(),
  action: z.enum(['click', 'type', 'none']),
  elementNumber: z.number(),
  valueSource: z.enum(['text', 'email', 'password']),
  text: z.string(),
  question: z.string()
});

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'stepTitle', 'narration', 'action', 'elementNumber', 'valueSource', 'text', 'question'],
  properties: {
    status: { type: 'string', enum: ['act', 'done', 'stuck'] },
    stepTitle: { type: 'string' },
    narration: { type: 'string' },
    action: { type: 'string', enum: ['click', 'type', 'none'] },
    elementNumber: { type: 'integer' },
    valueSource: { type: 'string', enum: ['text', 'email', 'password'] },
    text: { type: 'string' },
    question: { type: 'string' }
  }
} as const;

const instructions = `You drive a browser to film a short product walkthrough video for a goal.
Each turn you see the page title, address, the steps already taken, and a numbered list of interactive elements.
Pick exactly one next action that moves toward the goal, the way a calm product expert would demo it.
Rules:
- status "act": click or type into one listed element. elementNumber must be from the list.
- For typing a login email use valueSource "email"; for a password use valueSource "password" and leave text empty. You never see credentials.
- For any other typing use valueSource "text" and invent realistic demo text yourself, like "sam@acme.dev" for a teammate invite. Never stop to ask for demo data.
- status "done" only when the whole task is finished and confirmed on screen, like a success message, a new row in a list, or a saved change. Opening a form or dialog is never done: fill it with realistic demo data you make up and submit it. status "stuck" when no listed element can move toward the goal; then write a short question for the user in question, like "I can't find Invite teammate. Where is it now?".
- stepTitle: 2 to 5 words, sentence case, like "Click Invite teammate".
- narration: one short, playful, friendly line under 12 words that a voiceover reads while the action happens. Speak like a fun host guiding a friend, using direct instructions like "Type the link to your app." or "Now hit Record and watch it go." Never describe the viewer, so never write "you're typing" or "you click". No jargon, no element numbers.
- Never repeat a step that already succeeded. Prefer visible, obvious paths. Do not log out, delete, or pay.`;

const client = environment.openAIKey ? new OpenAI({ apiKey: environment.openAIKey }) : null;

interface PlannerInput {
  goal: string;
  hint: string | null;
  hasCredentials: boolean;
  pageTitle: string;
  pageURL: string;
  takenSteps: PlannedStep[];
  elementList: string;
  lastError: string | null;
}

export async function decideNextStep(input: PlannerInput): Promise<PlannerDecision> {
  if (!client) throw new Error('OPENAI_API_KEY is not set in worker/.env');
  const takenList = input.takenSteps.map((step, index) => `${index + 1}. ${step.title}`).join('\n') || 'None yet';
  const userMessage = [
    `Goal: ${input.goal}`,
    input.hint ? `Hint from the user: ${input.hint}` : '',
    input.hasCredentials
      ? 'A test login is available: use valueSource email and password on a sign in form.'
      : 'No saved login is available: always use valueSource text, and type any email or password the goal gives.',
    `Page: ${input.pageTitle} (${input.pageURL})`,
    `Steps taken:\n${takenList}`,
    input.lastError ? `Your last action failed: ${input.lastError}. Pick a different element or approach.` : '',
    `Elements:\n${input.elementList || 'No interactive elements found'}`
  ]
    .filter(Boolean)
    .join('\n\n');
  const response = await client.responses.create({
    model: environment.plannerModel,
    instructions,
    input: userMessage,
    text: { format: { type: 'json_schema', name: 'next_step', strict: true, schema: jsonSchema } }
  });
  return decisionSchema.parse(JSON.parse(readFirstJSONObject(readFirstOutputText(response))));
}

function readFirstOutputText(response: OpenAI.Responses.Response): string {
  for (const item of response.output) {
    if (item.type !== 'message') continue;
    for (const content of item.content) {
      if (content.type === 'output_text' && content.text.trim()) return content.text;
    }
  }
  return response.output_text;
}

function readFirstJSONObject(text: string): string {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('The planner did not return a decision');
  let depth = 0;
  let isInString = false;
  let isEscaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (isInString) {
      if (isEscaped) isEscaped = false;
      else if (character === '\\') isEscaped = true;
      else if (character === '"') isInString = false;
      continue;
    }
    if (character === '"') isInString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new Error('The planner returned an unfinished decision');
}
