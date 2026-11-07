import { v } from 'convex/values';

import { query } from './_generated/server';

export const listForVideo = query({
  args: { videoID: v.string() },
  handler: async (context, args) => {
    const videoID = context.db.normalizeId('videos', args.videoID);
    if (!videoID) return [];
    const steps = await context.db
      .query('steps')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    return steps.map((step) => ({
      id: step._id,
      kind: step.kind,
      title: step.title,
      narration: step.narration,
      startSeconds: step.startSeconds,
      isDone: step.isDone
    }));
  }
});
