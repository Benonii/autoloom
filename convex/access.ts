import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

export function assertWorker(workerSecret: string): void {
  const expectedSecret = process.env.WORKER_SECRET;
  if (!expectedSecret || workerSecret !== expectedSecret) throw new Error('Not allowed');
}

export async function readOwnedVideo(
  context: QueryCtx,
  videoID: Id<'videos'>,
  deviceID: string
): Promise<Doc<'videos'>> {
  const video = await context.db.get(videoID);
  if (!video || video.deviceID !== deviceID) throw new Error('Video not found');
  return video;
}
