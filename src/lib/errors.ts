export function readErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const match = /Uncaught Error: (.+?)(\n| at |$)/.exec(message);
  return match?.[1]?.trim() ?? 'Something went wrong. Try again.';
}
