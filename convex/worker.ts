import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalQuery, mutation, query } from './_generated/server';
import { assertWorker } from './access';
import { stepBox, stepKind } from './schema';
import { unseal } from './sealing';

const staleJobMilliseconds = 10 * 60 * 1000;

export const nextJob = query({
  args: { workerSecret: v.string() },
  handler: async (context, { workerSecret }) => {
    assertWorker(workerSecret);
    const job = await context.db
      .query('jobs')
      .withIndex('by_status', (index) => index.eq('status', 'queued'))
      .first();
    return job ? { id: job._id, videoID: job.videoID, kind: job.kind } : null;
  }
});

export const claimJob = mutation({
  args: { workerSecret: v.string(), jobID: v.id('jobs') },
  handler: async (context, { workerSecret, jobID }) => {
    assertWorker(workerSecret);
    const job = await context.db.get(jobID);
    const isStale = job?.status === 'running' && (job.claimedAt ?? 0) < Date.now() - staleJobMilliseconds;
    if (!job || (job.status !== 'queued' && !isStale)) return null;
    await context.db.patch(jobID, { status: 'running', claimedAt: Date.now() });
    const video = await context.db.get(job.videoID);
    if (!video) return null;
    const steps = await context.db
      .query('steps')
      .withIndex('by_video', (index) => index.eq('videoID', job.videoID))
      .collect();
    return {
      jobID,
      kind: job.kind,
      video: {
        id: video._id,
        appURL: video.appURL,
        goal: video.goal,
        voiceoverEnabled: video.voiceoverEnabled,
        voiceID: video.voiceID,
        hasCredentials: video.hasCredentials,
        hint: video.hint ?? null
      },
      steps: steps.map((step) => ({
        id: step._id,
        order: step.order,
        kind: step.kind,
        title: step.title,
        narration: step.narration,
        selector: step.selector ?? null,
        value: step.value ?? null
      }))
    };
  }
});

export const readSealedCredentials = internalQuery({
  args: { videoID: v.id('videos') },
  handler: async (context, { videoID }) => {
    return context.db
      .query('credentials')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .first();
  }
});

export const openCredentials = action({
  args: { workerSecret: v.string(), videoID: v.id('videos') },
  handler: async (context, { workerSecret, videoID }): Promise<{ email: string; password: string } | null> => {
    assertWorker(workerSecret);
    const credentials = await context.runQuery(internal.worker.readSealedCredentials, { videoID });
    if (!credentials) return null;
    return { email: await unseal(credentials.sealedEmail), password: await unseal(credentials.sealedPassword) };
  }
});

export const createUploadURL = mutation({
  args: { workerSecret: v.string() },
  handler: async (context, { workerSecret }) => {
    assertWorker(workerSecret);
    return context.storage.generateUploadUrl();
  }
});

export const saveLiveFrame = mutation({
  args: { workerSecret: v.string(), videoID: v.id('videos'), fileID: v.id('_storage') },
  handler: async (context, { workerSecret, videoID, fileID }) => {
    assertWorker(workerSecret);
    const video = await context.db.get(videoID);
    if (!video) return;
    if (video.liveFrameFileID) await context.storage.delete(video.liveFrameFileID);
    await context.db.patch(videoID, { liveFrameFileID: fileID });
  }
});

export const saveSteps = mutation({
  args: {
    workerSecret: v.string(),
    videoID: v.id('videos'),
    steps: v.array(
      v.object({
        kind: stepKind,
        title: v.string(),
        narration: v.string(),
        selector: v.optional(v.string()),
        value: v.optional(v.string()),
        isDone: v.boolean()
      })
    )
  },
  handler: async (context, { workerSecret, videoID, steps }) => {
    assertWorker(workerSecret);
    const existingSteps = await context.db
      .query('steps')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    const existingByOrder = new Map(existingSteps.map((step) => [step.order, step]));
    await Promise.all(
      steps.map((step, order) => {
        const existingStep = existingByOrder.get(order);
        if (existingStep) return context.db.patch(existingStep._id, step);
        return context.db.insert('steps', { ...step, videoID, order, startSeconds: 0 });
      })
    );
    await Promise.all(
      existingSteps.filter((step) => step.order >= steps.length).map((step) => context.db.delete(step._id))
    );
  }
});

export const updateStep = mutation({
  args: {
    workerSecret: v.string(),
    stepID: v.id('steps'),
    selector: v.optional(v.string()),
    startSeconds: v.optional(v.number()),
    box: v.optional(stepBox),
    isDone: v.optional(v.boolean())
  },
  handler: async (context, { workerSecret, stepID, ...changes }) => {
    assertWorker(workerSecret);
    await context.db.patch(stepID, changes);
  }
});

export const markStuck = mutation({
  args: { workerSecret: v.string(), videoID: v.id('videos'), question: v.string() },
  handler: async (context, { workerSecret, videoID, question }) => {
    assertWorker(workerSecret);
    await context.db.patch(videoID, { status: 'stuck', stuckQuestion: question, hint: undefined });
  }
});

export const readHint = query({
  args: { workerSecret: v.string(), videoID: v.id('videos') },
  handler: async (context, { workerSecret, videoID }) => {
    assertWorker(workerSecret);
    const video = await context.db.get(videoID);
    return video?.status === 'recording' ? (video.hint ?? null) : null;
  }
});

export const markRendering = mutation({
  args: { workerSecret: v.string(), videoID: v.id('videos') },
  handler: async (context, { workerSecret, videoID }) => {
    assertWorker(workerSecret);
    await context.db.patch(videoID, { status: 'rendering' });
  }
});

export const finishJob = mutation({
  args: {
    workerSecret: v.string(),
    jobID: v.id('jobs'),
    videoFileID: v.id('_storage'),
    durationSeconds: v.number()
  },
  handler: async (context, { workerSecret, jobID, videoFileID, durationSeconds }) => {
    assertWorker(workerSecret);
    const job = await context.db.get(jobID);
    if (!job) return;
    const video = await context.db.get(job.videoID);
    if (!video) return;
    if (video.videoFileID) await context.storage.delete(video.videoFileID);
    await context.db.patch(job.videoID, {
      status: 'ready',
      videoFileID,
      durationSeconds,
      errorMessage: undefined,
      stuckQuestion: undefined,
      hint: undefined
    });
    await context.db.patch(jobID, { status: 'done' });
  }
});

export const failJob = mutation({
  args: { workerSecret: v.string(), jobID: v.id('jobs'), errorMessage: v.string() },
  handler: async (context, { workerSecret, jobID, errorMessage }) => {
    assertWorker(workerSecret);
    const job = await context.db.get(jobID);
    if (!job) return;
    await context.db.patch(job.videoID, { status: 'failed', errorMessage });
    await context.db.patch(jobID, { status: 'failed' });
  }
});

export const heartbeat = mutation({
  args: { workerSecret: v.string() },
  handler: async (context, { workerSecret }) => {
    assertWorker(workerSecret);
    const recorder = await context.db.query('recorders').first();
    if (recorder) await context.db.patch(recorder._id, { lastSeenAt: Date.now() });
    else await context.db.insert('recorders', { lastSeenAt: Date.now() });
  }
});
