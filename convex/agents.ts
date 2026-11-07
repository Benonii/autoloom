import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { readOwnedVideo } from './access';
import { editNarration, giveHint, maximumGoalLength, normalizeURL, startRender, toPublicVideo } from './videos';

import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

const keyPrefix = 'autoloom_';

function toBase64URL(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function createSecret(): string {
  return toBase64URL(crypto.getRandomValues(new Uint8Array(24)));
}

async function hashKey(agentKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(agentKey.trim()));
  return toBase64URL(new Uint8Array(digest));
}

function toReadableError(error: unknown): ConvexError<string> {
  if (error instanceof ConvexError) return error;
  return new ConvexError(error instanceof Error ? error.message : 'Something went wrong');
}

async function readDevice(context: QueryCtx, agentKey: string): Promise<string> {
  const keyHash = await hashKey(agentKey);
  const record = await context.db
    .query('agentKeys')
    .withIndex('by_hash', (index) => index.eq('keyHash', keyHash))
    .unique();
  if (!record) throw new ConvexError('This Autoloom key is not valid. Make a new one at /connect.');
  return record.deviceID;
}

function readVideoID(context: QueryCtx, videoID: string): Id<'videos'> {
  const normalizedID = context.db.normalizeId('videos', videoID);
  if (!normalizedID) throw new ConvexError('Video not found');
  return normalizedID;
}

export const createKey = action({
  args: { deviceID: v.string() },
  handler: async (context, { deviceID }): Promise<string> => {
    const agentKey = `${keyPrefix}${createSecret()}`;
    await context.runMutation(internal.agents.saveKey, { deviceID, keyHash: await hashKey(agentKey) });
    return agentKey;
  }
});

export const saveKey = internalMutation({
  args: { deviceID: v.string(), keyHash: v.string() },
  handler: async (context, { deviceID, keyHash }) => {
    const oldKeys = await context.db
      .query('agentKeys')
      .withIndex('by_device', (index) => index.eq('deviceID', deviceID))
      .collect();
    await Promise.all(oldKeys.map((oldKey) => context.db.delete(oldKey._id)));
    await context.db.insert('agentKeys', { deviceID, keyHash });
  }
});

export const hasKey = query({
  args: { deviceID: v.string() },
  handler: async (context, { deviceID }) => {
    const record = await context.db
      .query('agentKeys')
      .withIndex('by_device', (index) => index.eq('deviceID', deviceID))
      .first();
    return record !== null;
  }
});

export const readDeviceForKey = internalQuery({
  args: { agentKey: v.string() },
  handler: (context, { agentKey }) => readDevice(context, agentKey)
});

export const createVideo = action({
  args: {
    agentKey: v.string(),
    appURL: v.string(),
    goal: v.string(),
    needsLogin: v.boolean(),
    voiceoverEnabled: v.boolean(),
    voiceID: v.string()
  },
  handler: async (context, args): Promise<{ videoID: Id<'videos'>; loginToken: string | null }> => {
    const deviceID: string = await context.runQuery(internal.agents.readDeviceForKey, { agentKey: args.agentKey });
    const goal = args.goal.trim();
    if (goal.length === 0) throw new ConvexError('Say what the video should show');
    if (goal.length > maximumGoalLength) throw new ConvexError('Keep the goal under 500 characters');
    let appURL: string;
    try {
      appURL = normalizeURL(args.appURL);
    } catch (error) {
      throw toReadableError(error);
    }
    const loginToken = args.needsLogin ? createSecret() : null;
    const videoID: Id<'videos'> = await context.runMutation(internal.videos.insert, {
      deviceID,
      appURL,
      goal,
      voiceoverEnabled: args.voiceoverEnabled,
      voiceID: args.voiceID,
      loginToken: loginToken ?? undefined
    });
    return { videoID, loginToken };
  }
});

export const readProgress = query({
  args: { agentKey: v.string(), videoID: v.string() },
  handler: async (context, args) => {
    const deviceID = await readDevice(context, args.agentKey);
    const videoID = readVideoID(context, args.videoID);
    const video = await readOwnedVideo(context, videoID, deviceID).catch(() => {
      throw new ConvexError('Video not found');
    });
    const steps = await context.db
      .query('steps')
      .withIndex('by_video', (index) => index.eq('videoID', videoID))
      .collect();
    return {
      video: await toPublicVideo(context, video),
      steps: steps.map((step) => ({ title: step.title, narration: step.narration, isDone: step.isDone }))
    };
  }
});

export const listVideos = query({
  args: { agentKey: v.string() },
  handler: async (context, { agentKey }) => {
    const deviceID = await readDevice(context, agentKey);
    const videos = await context.db
      .query('videos')
      .withIndex('by_device', (index) => index.eq('deviceID', deviceID))
      .order('desc')
      .take(20);
    return Promise.all(videos.map((video) => toPublicVideo(context, video)));
  }
});

export const answerQuestion = mutation({
  args: { agentKey: v.string(), videoID: v.string(), hint: v.string() },
  handler: async (context, args) => {
    const deviceID = await readDevice(context, args.agentKey);
    await giveHint(context, deviceID, readVideoID(context, args.videoID), args.hint).catch((error) => {
      throw toReadableError(error);
    });
  }
});

export const editLine = mutation({
  args: { agentKey: v.string(), videoID: v.string(), lineNumber: v.number(), narration: v.string() },
  handler: async (context, args) => {
    const deviceID = await readDevice(context, args.agentKey);
    const videoID = readVideoID(context, args.videoID);
    const step = await context.db
      .query('steps')
      .withIndex('by_video', (index) => index.eq('videoID', videoID).eq('order', args.lineNumber - 1))
      .unique();
    if (!step) throw new ConvexError(`There is no script line ${args.lineNumber}`);
    await editNarration(context, deviceID, step._id, args.narration).catch((error) => {
      throw toReadableError(error);
    });
  }
});

export const rerender = mutation({
  args: {
    agentKey: v.string(),
    videoID: v.string(),
    voiceoverEnabled: v.optional(v.boolean()),
    voiceID: v.optional(v.string())
  },
  handler: async (context, args) => {
    const deviceID = await readDevice(context, args.agentKey);
    await startRender(context, deviceID, readVideoID(context, args.videoID), {
      voiceoverEnabled: args.voiceoverEnabled,
      voiceID: args.voiceID
    }).catch((error) => {
      throw toReadableError(error);
    });
  }
});
