import { v } from 'convex/values';

import { query } from './_generated/server';

export const readPlace = query({
  args: { videoID: v.string() },
  handler: async (context, args) => {
    const videoID = context.db.normalizeId('videos', args.videoID);
    const recorder = await context.db.query('recorders').first();
    const queuedJobs = await context.db
      .query('jobs')
      .withIndex('by_status', (index) => index.eq('status', 'queued'))
      .collect();
    const jobIndex = queuedJobs.findIndex((job) => job.videoID === videoID);
    const runningJob = await context.db
      .query('jobs')
      .withIndex('by_status', (index) => index.eq('status', 'running'))
      .first();
    const otherRunningCount = runningJob && runningJob.videoID !== videoID ? 1 : 0;
    return {
      isQueued: jobIndex >= 0,
      videosAhead: jobIndex >= 0 ? jobIndex + otherRunningCount : 0,
      recorderLastSeenAt: recorder?.lastSeenAt ?? null
    };
  }
});
