import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

import { findTarget, performStep, settle } from '@worker/actions';
import { environment } from '@worker/environment';
import { viewport } from '@worker/explore';
import { overlayScript } from '@worker/overlay';

import type { Credentials, PlannedStep, Take, TakeSegment } from '@worker/types';

const typingDelayMilliseconds = 70;

export async function recordTake(
  appURL: string,
  steps: PlannedStep[],
  credentials: Credentials | null,
  directory: string
): Promise<Take> {
  const rawDirectory = path.join(directory, 'raw');
  await rm(rawDirectory, { recursive: true, force: true });
  await mkdir(rawDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: environment.isHeadless });
  const context = await browser.newContext({ viewport, recordVideo: { dir: rawDirectory, size: viewport } });
  await context.addInitScript(overlayScript);
  const page = await context.newPage();
  const startedAt = Date.now();
  const elapsedSeconds = () => (Date.now() - startedAt) / 1000;
  const segments: TakeSegment[] = [];
  try {
    await page.goto(appURL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await settle(page);
    await page.waitForTimeout(600);
    for (const [stepIndex, step] of steps.entries()) {
      const target = await findTarget(page, step, 8000);
      if (!target) throw new Error(`Step ${stepIndex + 1} (“${step.title}”) is no longer on the page. Try Re-record.`);
      await target.scrollIntoViewIfNeeded().catch(() => undefined);
      const box = await target.boundingBox();
      const startSeconds = elapsedSeconds();
      if (box) {
        await page.evaluate((point) => window.__autoloomOverlay?.moveTo(point.x, point.y), {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2
        });
        await page.waitForTimeout(800);
        await page.evaluate((elementBox) => window.__autoloomOverlay?.ring(elementBox), box);
        await page.waitForTimeout(300);
      }
      await performStep(target, step, credentials, typingDelayMilliseconds);
      await settle(page);
      await page.waitForTimeout(900);
      segments.push({ stepIndex, startSeconds, endSeconds: elapsedSeconds(), box });
    }
    await page.waitForTimeout(800);
  } finally {
    await context.close();
    await browser.close();
  }
  const totalSeconds = elapsedSeconds();
  const recordedFile = (await readdir(rawDirectory)).find((name) => name.endsWith('.webm'));
  if (!recordedFile) throw new Error('The browser did not save a recording');
  const videoPath = path.join(directory, 'take.webm');
  await rename(path.join(rawDirectory, recordedFile), videoPath);
  return { videoPath, totalSeconds, viewport, segments };
}

declare global {
  interface Window {
    __autoloomOverlay?: { moveTo: (x: number, y: number) => void; ring: (box: unknown) => void };
  }
}
