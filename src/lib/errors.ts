import { ConvexError } from 'convex/values';

export function readErrorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'string') return error.data;
  const message = error instanceof Error ? error.message : '';
  const match = /Uncaught (?:Convex)?Error: (.+?)(\n| at |$)/.exec(message);
  return match?.[1]?.trim() ?? 'Something went wrong. Try again.';
}
