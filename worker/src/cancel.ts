import { AsyncLocalStorage } from 'node:async_hooks';

const jobSignal = new AsyncLocalStorage<AbortSignal>();

export function runWithJobSignal<Result>(signal: AbortSignal, task: () => Promise<Result>): Promise<Result> {
  return jobSignal.run(signal, task);
}

export function readJobSignal(): AbortSignal | null {
  return jobSignal.getStore() ?? null;
}

export function throwIfStopped(): void {
  if (readJobSignal()?.aborted) throw new Error('This video was stopped');
}
