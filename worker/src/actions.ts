import type { Locator, Page } from 'playwright';

import type { Credentials, PlannedStep } from '@worker/types';

export function fillSecrets(value: string, credentials: Credentials | null): string {
  return value.replace(/\{\{(email|password)\}\}/g, (_match, key: 'email' | 'password') => {
    if (!credentials) throw new Error('This step needs a login, but no test account was saved');
    return credentials[key];
  });
}

export async function findTarget(page: Page, step: PlannedStep, timeoutMilliseconds: number): Promise<Locator | null> {
  if (!step.selector) return null;
  const locator = page.locator(step.selector).first();
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMilliseconds });
    return locator;
  } catch {
    return null;
  }
}

export async function performStep(
  locator: Locator,
  step: PlannedStep,
  credentials: Credentials | null,
  typingDelayMilliseconds: number
): Promise<void> {
  if (step.kind === 'click') {
    await locator.click({ timeout: 10_000 });
    return;
  }
  if (step.kind === 'type') {
    const text = fillSecrets(step.value ?? '', credentials);
    for (let attempt = 0; attempt < maximumTypingAttempts; attempt += 1) {
      await typeText(locator, text, typingDelayMilliseconds);
      if (await hasValue(locator, text)) return;
      await locator.page().waitForTimeout(retypeWaitMilliseconds);
      if (await hasValue(locator, text)) return;
    }
    throw new Error('The text did not stay in the field');
  }
}

const maximumTypingAttempts = 3;
const retypeWaitMilliseconds = 1000;

async function typeText(locator: Locator, text: string, typingDelayMilliseconds: number): Promise<void> {
  await locator.click({ timeout: 10_000 });
  await locator.press('ControlOrMeta+a');
  await locator.press('Backspace');
  await locator.pressSequentially(text, { delay: typingDelayMilliseconds });
}

async function hasValue(locator: Locator, text: string): Promise<boolean> {
  try {
    return (await locator.inputValue({ timeout: 1000 })) === text;
  } catch {
    return true;
  }
}

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => undefined);
}
