import type { PublicStep, PublicVideo, WalkthroughStep } from '@/types';

export function toWalkthroughSteps(steps: PublicStep[], videoStatus: PublicVideo['status']): WalkthroughStep[] {
  const firstOpenIndex = steps.findIndex((step) => !step.isDone);
  return steps.map((step, index) => {
    if (videoStatus !== 'recording' && videoStatus !== 'stuck') return { ...step, status: 'done' };
    if (step.isDone) return { ...step, status: 'done' };
    if (index === firstOpenIndex) return { ...step, status: videoStatus === 'stuck' ? 'stuck' : 'active' };
    return { ...step, status: 'waiting' };
  });
}

export function formatTimestamp(totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = `${roundedSeconds % 60}`.padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function readHostname(appURL: string): string {
  try {
    return new URL(appURL).hostname;
  } catch {
    return appURL;
  }
}
