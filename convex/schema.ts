import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const videoStatus = v.union(
  v.literal('waitingForLogin'),
  v.literal('recording'),
  v.literal('stuck'),
  v.literal('rendering'),
  v.literal('ready'),
  v.literal('failed')
);

export const stepKind = v.union(v.literal('navigate'), v.literal('click'), v.literal('type'));

export const stepBox = v.object({ x: v.number(), y: v.number(), width: v.number(), height: v.number() });

export const jobKind = v.union(v.literal('record'), v.literal('render'), v.literal('rerecord'), v.literal('launch'));

export const launchStatus = v.union(v.literal('making'), v.literal('ready'), v.literal('failed'));

export const jobStatus = v.union(v.literal('queued'), v.literal('running'), v.literal('done'), v.literal('failed'));

export default defineSchema({
  videos: defineTable({
    deviceID: v.string(),
    title: v.string(),
    appURL: v.string(),
    goal: v.string(),
    status: videoStatus,
    voiceoverEnabled: v.boolean(),
    voiceID: v.string(),
    hasCredentials: v.boolean(),
    durationSeconds: v.optional(v.number()),
    videoFileID: v.optional(v.id('_storage')),
    liveFrameFileID: v.optional(v.id('_storage')),
    stuckQuestion: v.optional(v.string()),
    hint: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    hasUnrenderedEdits: v.boolean(),
    loginToken: v.optional(v.string()),
    launchStatus: v.optional(launchStatus),
    launchFileID: v.optional(v.id('_storage')),
    launchErrorMessage: v.optional(v.string())
  }).index('by_device', ['deviceID']),
  agentKeys: defineTable({
    deviceID: v.string(),
    keyHash: v.string()
  })
    .index('by_hash', ['keyHash'])
    .index('by_device', ['deviceID']),
  steps: defineTable({
    videoID: v.id('videos'),
    order: v.number(),
    kind: stepKind,
    title: v.string(),
    narration: v.string(),
    selector: v.optional(v.string()),
    value: v.optional(v.string()),
    startSeconds: v.number(),
    box: v.optional(stepBox),
    isDone: v.boolean()
  }).index('by_video', ['videoID', 'order']),
  jobs: defineTable({
    videoID: v.id('videos'),
    kind: jobKind,
    status: jobStatus,
    claimedAt: v.optional(v.number())
  })
    .index('by_status', ['status'])
    .index('by_video', ['videoID']),
  recorders: defineTable({
    lastSeenAt: v.number()
  }),
  credentials: defineTable({
    videoID: v.id('videos'),
    sealedEmail: v.string(),
    sealedPassword: v.string()
  }).index('by_video', ['videoID'])
});
