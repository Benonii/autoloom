import { readFile } from 'node:fs/promises';
import { ConvexClient, ConvexHttpClient } from 'convex/browser';

import { environment } from '@worker/environment';
import { api } from '../../convex/_generated/api';

import type { ClaimedJob, Credentials, PlannedStep, StepBox } from '@worker/types';
import type { Id } from '../../convex/_generated/dataModel';

export const liveClient = new ConvexClient(environment.convexURL);
const client = new ConvexHttpClient(environment.convexURL);
const workerSecret = environment.workerSecret;

export { api };

export async function sendHeartbeat(): Promise<void> {
  await client.mutation(api.worker.heartbeat, { workerSecret });
}

export async function claimJob(jobID: string): Promise<ClaimedJob | null> {
  return (await client.mutation(api.worker.claimJob, {
    workerSecret,
    jobID: jobID as Id<'jobs'>
  })) as ClaimedJob | null;
}

export async function openCredentials(videoID: string): Promise<Credentials | null> {
  return client.action(api.worker.openCredentials, { workerSecret, videoID: videoID as Id<'videos'> });
}

export async function uploadFile(filePath: string, contentType: string): Promise<Id<'_storage'>> {
  const uploadURL = await client.mutation(api.worker.createUploadURL, { workerSecret });
  const response = await fetch(uploadURL, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: await readFile(filePath)
  });
  if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
  const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
  return storageId;
}

export async function uploadBytes(bytes: Uint8Array, contentType: string): Promise<Id<'_storage'>> {
  const uploadURL = await client.mutation(api.worker.createUploadURL, { workerSecret });
  const response = await fetch(uploadURL, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bytes)
  });
  if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
  const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
  return storageId;
}

export async function saveLiveFrame(videoID: string, frame: Uint8Array): Promise<void> {
  const fileID = await uploadBytes(frame, 'image/jpeg');
  await client.mutation(api.worker.saveLiveFrame, { workerSecret, videoID: videoID as Id<'videos'>, fileID });
}

export async function saveSteps(videoID: string, steps: PlannedStep[], doneCount: number): Promise<void> {
  await client.mutation(api.worker.saveSteps, {
    workerSecret,
    videoID: videoID as Id<'videos'>,
    steps: steps.map((step, index) => ({
      kind: step.kind,
      title: step.title,
      narration: step.narration,
      selector: step.selector,
      value: step.value,
      isDone: index < doneCount
    }))
  });
}

export async function readStepIDs(videoID: string): Promise<string[]> {
  const steps = await client.query(api.steps.listForVideo, { videoID });
  return steps.map((step) => step.id);
}

export async function updateStep(
  stepID: string,
  changes: { startSeconds?: number; box?: StepBox; isDone?: boolean }
): Promise<void> {
  await client.mutation(api.worker.updateStep, { workerSecret, stepID: stepID as Id<'steps'>, ...changes });
}

export async function markStuck(videoID: string, question: string): Promise<void> {
  await client.mutation(api.worker.markStuck, { workerSecret, videoID: videoID as Id<'videos'>, question });
}

export async function readHint(videoID: string): Promise<string | null> {
  return client.query(api.worker.readHint, { workerSecret, videoID: videoID as Id<'videos'> });
}

export async function markRendering(videoID: string): Promise<void> {
  await client.mutation(api.worker.markRendering, { workerSecret, videoID: videoID as Id<'videos'> });
}

export async function finishJob(jobID: string, videoFileID: Id<'_storage'>, durationSeconds: number): Promise<void> {
  await client.mutation(api.worker.finishJob, {
    workerSecret,
    jobID: jobID as Id<'jobs'>,
    videoFileID,
    durationSeconds
  });
}

export async function failJob(jobID: string, errorMessage: string): Promise<void> {
  await client.mutation(api.worker.failJob, { workerSecret, jobID: jobID as Id<'jobs'>, errorMessage });
}
