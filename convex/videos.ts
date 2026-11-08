import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalMutation, mutation, query } from './_generated/server';
import { readOwnedVideo } from './access';
import { assertReachable } from './reachability';
import { seal } from './sealing';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export const maximumGoalLength = 500;

function isBusy(status: Doc<'videos'>['status']): boolean {
  return status === 'recording' || status === 'rendering' || status === 'waitingForLogin';
}

export function readTitle(goal: string): string {
  const trimmedGoal = goal.trim().replace(/^show (me )?how to /i, '');
  const title = trimmedGoal.charAt(0).toUpperCase() + trimmedGoal.slice(1);
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

function readURL(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

export function normalizeURL(appURL: string): string {
  const trimmedURL = appURL.trim();
  const withProtocol = /^https?:\/\//i.test(trimmedURL) ? trimmedURL : `https://${trimmedURL}`;
  const parsed = readURL(withProtocol);
  if (!parsed || /\s/.test(trimmedURL) || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost'))
    throw new ConvexError('Enter a full web address, like acme.com');
  return parsed.toString();
}

export async function toPublicVideo(context: QueryCtx, video: Doc<'videos'>) {
  const videoURL = video.videoFileID ? await context.storage.getUrl(video.videoFileID) : null;
  const liveFrameURL = video.liveFrameFileID ? await context.storage.getUrl(video.liveFrameFileID) : null;
  return {
    id: video._id,
    title: video.title,
    appURL: video.appURL,
    goal: video.goal,
    status: video.status,
    voiceoverEnabled: video.voiceoverEnabled,
    voiceID: video.voiceID,
    hasCredentials: video.hasCredentials,
    durationSeconds: video.durationSeconds ?? null,
    stuckQuestion: video.stuckQuestion ?? null,
    errorMessage: video.errorMessage ?? null,
    hasUnrenderedEdits: video.hasUnrenderedEdits,
    updatedAt: video._creationTime,
    videoURL,
    liveFrameURL
  };
}

export const create = action({
  args: {
    deviceID: v.string(),
    appURL: v.string(),
    goal: v.string(),
    voiceoverEnabled: v.boolean(),
    voiceID: v.string(),
    email: v.optional(v.string()),
    password: v.optional(v.string())
  },
  handler: async (context, args): Promise<Id<'videos'>> => {
    const goal = args.goal.trim();
    if (goal.length === 0) throw new ConvexError('Tell us what the video should show');
    if (goal.length > maximumGoalLength) throw new ConvexError('Keep the goal under 500 characters');
    const appURL = normalizeURL(args.appURL);
    await assertReachable(appURL);
    const hasCredentials = Boolean(args.email && args.password);
    const sealedEmail = hasCredentials && args.email ? await seal(args.email) : undefined;
    const sealedPassword = hasCredentials && args.password ? await seal(args.password) : undefined;
    return context.runMutation(internal.videos.insert, {
      deviceID: args.deviceID,
      appURL,
      goal,
      voiceoverEnabled: args.voiceoverEnabled,
      voiceID: args.voiceID,
      sealedEmail,
      sealedPassword
    });
  }
});

export const insert = internalMutation({
  args: {
    deviceID: v.string(),
    appURL: v.string(),
    goal: v.string(),
    voiceoverEnabled: v.boolean(),
    voiceID: v.string(),
    sealedEmail: v.optional(v.string()),
    sealedPassword: v.optional(v.string()),
    loginToken: v.optional(v.string()),
    title: v.optional(v.string())
  },
  handler: async (context, args) => {
    const hasCredentials = Boolean(args.sealedEmail && args.sealedPassword);
    const videoID = await context.db.insert('videos', {
      deviceID: args.deviceID,
      title: readTitle(args.title ?? args.goal),
      appURL: args.appURL,
      goal: args.goal,
      status: args.loginToken ? 'waitingForLogin' : 'recording',
      loginToken: args.loginToken,
      voiceoverEnabled: args.voiceoverEnabled,
      voiceID: args.voiceID,
      hasCredentials,
      hasUnrenderedEdits: false
    });
    if (args.sealedEmail && args.sealedPassword) {
      await context.db.insert('credentials', {
        videoID,
        sealedEmail: args.sealedEmail,
        sealedPassword: args.sealedPassword
      });
    }
    if (!args.loginToken) await context.db.insert('jobs', { videoID, kind: 'record', status: 'queued' });
    return videoID;
  }
});

export const get = query({
  args: { videoID: v.string() },
  handler: async (context, args) => {
    const videoID = context.db.normalizeId('videos', args.videoID);
    if (!videoID) return null;
    const video = await context.db.get(videoID);
    if (!video) return null;
    return toPublicVideo(context, video);
  }
});

export const listMine = query({
  args: { deviceID: v.string() },
  handler: async (context, { deviceID }) => {
    const videos = await context.db
      .query('videos')
      .withIndex('by_device', (index) => index.eq('deviceID', deviceID))
      .order('desc')
      .take(50);
    const queuedJobs = await context.db
      .query('jobs')
      .withIndex('by_status', (index) => index.eq('status', 'queued'))
      .collect();
    const runningJob = await context.db
      .query('jobs')
      .withIndex('by_status', (index) => index.eq('status', 'running'))
      .first();
    const runningCount = runningJob ? 1 : 0;
    return Promise.all(
      videos.map(async (video) => {
        const jobIndex = queuedJobs.findIndex((job) => job.videoID === video._id);
        return {
          ...(await toPublicVideo(context, video)),
          videosAhead: jobIndex >= 0 ? jobIndex + runningCount : null
        };
      })
    );
  }
});

export const isOwner = query({
  args: { videoID: v.string(), deviceID: v.string() },
  handler: async (context, args) => {
    const videoID = context.db.normalizeId('videos', args.videoID);
    if (!videoID) return false;
    const video = await context.db.get(videoID);
    return video?.deviceID === args.deviceID;
  }
});

export async function editNarration(context: MutationCtx, deviceID: string, stepID: Id<'steps'>, narration: string) {
  const step = await context.db.get(stepID);
  if (!step) throw new ConvexError('Step not found');
  await readOwnedVideo(context, step.videoID, deviceID);
  const trimmedNarration = narration.trim();
  if (trimmedNarration.length === 0) throw new ConvexError('Narration cannot be empty');
  if (trimmedNarration === step.narration) return;
  await context.db.patch(stepID, { narration: trimmedNarration });
  await context.db.patch(step.videoID, { hasUnrenderedEdits: true });
}

export const updateNarration = mutation({
  args: { deviceID: v.string(), stepID: v.id('steps'), narration: v.string() },
  handler: (context, { deviceID, stepID, narration }) => editNarration(context, deviceID, stepID, narration)
});

interface RenderOptions {
  voiceoverEnabled?: boolean;
  voiceID?: string;
}

export async function startRender(
  context: MutationCtx,
  deviceID: string,
  videoID: Id<'videos'>,
  { voiceoverEnabled, voiceID }: RenderOptions
) {
  const video = await readOwnedVideo(context, videoID, deviceID);
  if (isBusy(video.status)) throw new ConvexError('This video is already being made');
  await context.db.patch(videoID, {
    status: 'rendering',
    hasUnrenderedEdits: false,
    voiceoverEnabled: voiceoverEnabled ?? video.voiceoverEnabled,
    voiceID: voiceID ?? video.voiceID
  });
  await context.db.insert('jobs', { videoID, kind: 'render', status: 'queued' });
}

export const rerender = mutation({
  args: {
    deviceID: v.string(),
    videoID: v.id('videos'),
    voiceoverEnabled: v.optional(v.boolean()),
    voiceID: v.optional(v.string())
  },
  handler: (context, { deviceID, videoID, voiceoverEnabled, voiceID }) =>
    startRender(context, deviceID, videoID, { voiceoverEnabled, voiceID })
});

export const stoppedMessage = 'You stopped this video.';

const stoppableStatuses = new Set(['waitingForLogin', 'recording', 'rendering', 'stuck']);

export async function stopVideo(context: MutationCtx, deviceID: string, videoID: Id<'videos'>) {
  const video = await readOwnedVideo(context, videoID, deviceID);
  if (!stoppableStatuses.has(video.status)) throw new ConvexError('This video is not being made right now');
  const jobs = await context.db
    .query('jobs')
    .withIndex('by_video', (index) => index.eq('videoID', videoID))
    .collect();
  await Promise.all(
    jobs
      .filter((job) => job.status === 'queued' || job.status === 'running')
      .map((job) => context.db.patch(job._id, { status: 'failed' }))
  );
  if (video.videoFileID) {
    await context.db.patch(videoID, {
      status: 'ready',
      stuckQuestion: undefined,
      hint: undefined,
      loginToken: undefined
    });
    return;
  }
  await context.db.patch(videoID, {
    status: 'failed',
    errorMessage: stoppedMessage,
    stuckQuestion: undefined,
    hint: undefined,
    loginToken: undefined
  });
}

export const stop = mutation({
  args: { deviceID: v.string(), videoID: v.id('videos') },
  handler: (context, { deviceID, videoID }) => stopVideo(context, deviceID, videoID)
});

export const rerecord = mutation({
  args: { deviceID: v.string(), videoID: v.id('videos') },
  handler: async (context, { deviceID, videoID }) => {
    const video = await readOwnedVideo(context, videoID, deviceID);
    if (isBusy(video.status)) throw new ConvexError('This video is already being made');
    await context.db.patch(videoID, { status: 'recording', hasUnrenderedEdits: false });
    await context.db.insert('jobs', { videoID, kind: 'rerecord', status: 'queued' });
  }
});

export async function giveHint(context: MutationCtx, deviceID: string, videoID: Id<'videos'>, hint: string) {
  const video = await readOwnedVideo(context, videoID, deviceID);
  if (video.status !== 'stuck') throw new ConvexError('The recorder is not waiting for a hint right now');
  const trimmedHint = hint.trim();
  if (trimmedHint.length === 0) throw new ConvexError('Add a hint so the agent knows what to try');
  await context.db.patch(videoID, { status: 'recording', hint: trimmedHint, stuckQuestion: undefined });
}

export const answerStuck = mutation({
  args: { deviceID: v.string(), videoID: v.id('videos'), hint: v.string() },
  handler: (context, { deviceID, videoID, hint }) => giveHint(context, deviceID, videoID, hint)
});

export const remove = mutation({
  args: { deviceID: v.string(), videoID: v.id('videos') },
  handler: async (context, { deviceID, videoID }) => {
    const video = await readOwnedVideo(context, videoID, deviceID);
    const steps = await context.db
      .query('steps')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    await Promise.all(steps.map((step) => context.db.delete(step._id)));
    const credentials = await context.db
      .query('credentials')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    await Promise.all(credentials.map((credential) => context.db.delete(credential._id)));
    const jobs = await context.db
      .query('jobs')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    await Promise.all(jobs.map((job) => context.db.delete(job._id)));
    if (video.videoFileID) await context.storage.delete(video.videoFileID);
    if (video.liveFrameFileID) await context.storage.delete(video.liveFrameFileID);
    await context.db.delete(videoID);
  }
});

const loginStatuses = new Set<Doc<'videos'>['status']>(['waitingForLogin', 'stuck', 'failed', 'ready']);

export function canTakeLogin(status: Doc<'videos'>['status']): boolean {
  return loginStatuses.has(status);
}

export const readLoginRequest = query({
  args: { videoID: v.string(), loginToken: v.string() },
  handler: async (context, args) => {
    const videoID = context.db.normalizeId('videos', args.videoID);
    if (!videoID) return null;
    const video = await context.db.get(videoID);
    if (!video) return null;
    const isOpen = canTakeLogin(video.status) && video.loginToken === args.loginToken;
    return { title: video.title, appURL: video.appURL, isOpen };
  }
});

export const addLogin = action({
  args: { videoID: v.string(), loginToken: v.string(), email: v.string(), password: v.string() },
  handler: async (context, args): Promise<void> => {
    const email = args.email.trim();
    if (email.length === 0 || args.password.length === 0)
      throw new ConvexError('Enter both the email and the password');
    await context.runMutation(internal.videos.attachLogin, {
      videoID: args.videoID,
      loginToken: args.loginToken,
      sealedEmail: await seal(email),
      sealedPassword: await seal(args.password)
    });
  }
});

export const attachLogin = internalMutation({
  args: { videoID: v.string(), loginToken: v.string(), sealedEmail: v.string(), sealedPassword: v.string() },
  handler: async (context, args) => {
    const videoID = context.db.normalizeId('videos', args.videoID);
    const video = videoID ? await context.db.get(videoID) : null;
    if (!videoID || !video || !canTakeLogin(video.status) || video.loginToken !== args.loginToken)
      throw new ConvexError('This login link has already been used or is not valid');
    const oldCredentials = await context.db
      .query('credentials')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    await Promise.all(oldCredentials.map((credential) => context.db.delete(credential._id)));
    await context.db.insert('credentials', {
      videoID,
      sealedEmail: args.sealedEmail,
      sealedPassword: args.sealedPassword
    });
    const openJobs = await context.db
      .query('jobs')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    await Promise.all(
      openJobs
        .filter((job) => job.status === 'queued' || job.status === 'running')
        .map((job) => context.db.patch(job._id, { status: 'failed' }))
    );
    await context.db.patch(videoID, {
      status: 'recording',
      hasCredentials: true,
      loginToken: undefined,
      hint: undefined,
      stuckQuestion: undefined,
      errorMessage: undefined
    });
    await context.db.insert('jobs', { videoID, kind: 'record', status: 'queued' });
  }
});
