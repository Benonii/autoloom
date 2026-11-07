import { ConvexError } from 'convex/values';

const checkTimeoutMilliseconds = 8000;

const privateHostPattern = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)|\.local$/;

function isPrivateHost(hostname: string): boolean {
  return privateHostPattern.test(hostname);
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export async function assertReachable(appURL: string): Promise<void> {
  if (isPrivateHost(new URL(appURL).hostname)) return;
  try {
    const response = await fetch(appURL, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(checkTimeoutMilliseconds)
    });
    await response.body?.cancel();
  } catch (error) {
    if (isTimeout(error)) return;
    throw new ConvexError(
      'We could not reach that website. Check the link for typos and make sure the site is online.'
    );
  }
}
