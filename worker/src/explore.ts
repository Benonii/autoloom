import { chromium } from 'playwright';

import { findTarget, performStep, settle } from '@worker/actions';
import { throwIfStopped } from '@worker/cancel';
import { markStuck, readHint, saveLiveFrame, saveSteps } from '@worker/convex';
import { collectElements, describeElements, resolveDurableSelector } from '@worker/elements';
import { environment } from '@worker/environment';
import { decideNextStep } from '@worker/planner';

import type { Credentials, JobVideo, PlannedStep } from '@worker/types';
import type { Page } from 'playwright';

const maximumSteps = 30;
const hintWaitMilliseconds = 10 * 60 * 1000;
export const viewport = { width: 1280, height: 720 };

function readFirstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (message.split('\n')[0] ?? message).slice(0, 160);
}

async function sendLiveFrame(page: Page, videoID: string): Promise<void> {
  try {
    const frame = await page.screenshot({ type: 'jpeg', quality: 60 });
    await saveLiveFrame(videoID, frame);
  } catch (error) {
    console.warn('Could not send live frame', error);
  }
}

async function waitForHint(video: JobVideo, question: string): Promise<string> {
  await markStuck(video.id, question);
  const startedAt = Date.now();
  while (Date.now() - startedAt < hintWaitMilliseconds) {
    throwIfStopped();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const hint = await readHint(video.id);
    if (hint) return hint;
  }
  throw new Error('Nobody answered the agent’s question in time');
}

export async function explore(
  video: JobVideo,
  credentials: Credentials | null,
  knownSteps: PlannedStep[]
): Promise<PlannedStep[]> {
  const browser = await chromium.launch({ headless: environment.isHeadless });
  const page = await browser.newPage({ viewport });
  const takenSteps: PlannedStep[] = [];
  let hint = video.hint;
  let lastError: string | null = null;
  let failureCount = 0;
  try {
    await page.goto(video.appURL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await settle(page);
    await sendLiveFrame(page, video.id);
    for (const knownStep of knownSteps) {
      const target = await findTarget(page, knownStep, 5000);
      if (!target) break;
      await performStep(target, knownStep, credentials, 0);
      await settle(page);
      takenSteps.push(knownStep);
      await saveSteps(video.id, takenSteps, takenSteps.length);
      await sendLiveFrame(page, video.id);
    }
    if (takenSteps.length === knownSteps.length && knownSteps.length > 0) return takenSteps;
    while (takenSteps.length < maximumSteps) {
      throwIfStopped();
      const elements = await collectElements(page);
      const decision = await decideNextStep({
        goal: video.goal,
        hint,
        hasCredentials: video.hasCredentials,
        pageTitle: await page.title(),
        pageURL: page.url(),
        takenSteps,
        elementList: describeElements(elements),
        lastError
      });
      if (decision.status === 'done') break;
      const element = elements.find((candidate) => candidate.number === decision.elementNumber);
      if (decision.status === 'stuck' || !element || decision.action === 'none') {
        await sendLiveFrame(page, video.id);
        hint = await waitForHint(
          video,
          decision.question || `I could not find the next step for "${video.goal}". Where should I look?`
        );
        continue;
      }
      const selector = await resolveDurableSelector(page, element);
      const value =
        decision.action === 'type'
          ? decision.valueSource === 'text' || !credentials
            ? decision.text
            : `{{${decision.valueSource}}}`
          : undefined;
      const step: PlannedStep = {
        kind: decision.action === 'type' ? 'type' : 'click',
        title: decision.stepTitle,
        narration: decision.narration,
        selector,
        value
      };
      await saveSteps(video.id, [...takenSteps, step], takenSteps.length);
      const target = page.locator(`[data-autoloom-number="${element.number}"]`).first();
      try {
        await performStep(target, step, credentials, 0);
      } catch (error) {
        failureCount += 1;
        lastError = `could not ${step.kind} "${element.name}" (${readFirstLine(error)})`;
        await saveSteps(video.id, takenSteps, takenSteps.length);
        if (failureCount >= 3) {
          await sendLiveFrame(page, video.id);
          hint = await waitForHint(video, `I keep failing to ${step.title.toLowerCase()}. What should I try?`);
          failureCount = 0;
        }
        continue;
      }
      lastError = null;
      failureCount = 0;
      await settle(page);
      takenSteps.push(step);
      await saveSteps(video.id, takenSteps, takenSteps.length);
      await sendLiveFrame(page, video.id);
    }
    if (takenSteps.length === 0) throw new Error('The agent could not find any steps for this goal');
    return takenSteps;
  } finally {
    await browser.close();
  }
}
