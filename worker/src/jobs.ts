import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import {
  failJob,
  finishJob,
  finishLaunchJob,
  markRendering,
  openCredentials,
  readStepIDs,
  updateStep,
  uploadFile
} from '@worker/convex';
import { environment } from '@worker/environment';
import { explore } from '@worker/explore';
import { renderLaunch } from '@worker/launch';
import { writeLaunchCopy } from '@worker/launchCopy';
import { renderWalkthrough } from '@worker/render';
import { recordTake } from '@worker/replay';
import { narrate } from '@worker/voice';

import type { ClaimedJob, Credentials, JobStep, PlannedStep, Take } from '@worker/types';

function toPlannedStep(step: JobStep): PlannedStep {
  return {
    id: step.id,
    kind: step.kind,
    title: step.title,
    narration: step.narration,
    selector: step.selector ?? undefined,
    value: step.value ?? undefined
  };
}

async function readSavedTake(directory: string, stepCount: number): Promise<Take | null> {
  try {
    const take = JSON.parse(await readFile(path.join(directory, 'take.json'), 'utf8')) as Take;
    return take.segments.length === stepCount ? take : null;
  } catch {
    return null;
  }
}

async function produceVideo(
  job: ClaimedJob,
  steps: PlannedStep[],
  credentials: Credentials | null,
  shouldRecord: boolean
) {
  const directory = path.join(environment.outputDirectory, job.video.id);
  await mkdir(directory, { recursive: true });
  await markRendering(job.video.id);
  const savedTake = shouldRecord ? null : await readSavedTake(directory, steps.length);
  const take = savedTake ?? (await recordTake(job.video.appURL, steps, credentials, directory));
  await writeFile(path.join(directory, 'take.json'), JSON.stringify(take, null, 2));
  const narrations = await narrate(
    steps.map((step) => step.narration),
    job.video.voiceoverEnabled,
    job.video.voiceID,
    directory
  );
  const { outputPath, segments, totalSeconds } = await renderWalkthrough(take, narrations, directory);
  const stepIDs = await readStepIDs(job.video.id);
  const stepSegments = segments.filter((segment) => segment.text);
  await Promise.all(
    stepIDs.map((stepID, index) => {
      const segment = stepSegments[index];
      if (!segment) return Promise.resolve();
      return updateStep(stepID, {
        startSeconds: Math.round(segment.outputStartSeconds * 10) / 10,
        box: segment.box ?? undefined,
        isDone: true
      });
    })
  );
  const videoFileID = await uploadFile(outputPath, 'video/mp4');
  await finishJob(job.jobID, videoFileID, Math.round(totalSeconds));
}

async function produceLaunchVideo(job: ClaimedJob, steps: PlannedStep[], credentials: Credentials | null) {
  const directory = path.join(environment.outputDirectory, job.video.id);
  await mkdir(directory, { recursive: true });
  const savedTake = await readSavedTake(directory, steps.length);
  const take = savedTake ?? (await recordTake(job.video.appURL, steps, credentials, directory));
  if (!savedTake) await writeFile(path.join(directory, 'take.json'), JSON.stringify(take, null, 2));
  const copy = await writeLaunchCopy(job.video.goal, steps);
  const outputPath = await renderLaunch(take, copy, job.video.appURL, directory);
  const launchFileID = await uploadFile(outputPath, 'video/mp4');
  await finishLaunchJob(job.jobID, launchFileID);
}

export async function runJob(job: ClaimedJob): Promise<void> {
  const startedAt = Date.now();
  console.log(`Job ${job.kind} for ${job.video.appURL}: ${job.video.goal}`);
  try {
    const credentials = job.video.hasCredentials ? await openCredentials(job.video.id) : null;
    if (job.kind === 'launch') {
      await produceLaunchVideo(job, job.steps.map(toPlannedStep), credentials);
    } else if (job.kind === 'render') {
      await produceVideo(job, job.steps.map(toPlannedStep), credentials, false);
    } else {
      const knownSteps = job.kind === 'rerecord' ? job.steps.map(toPlannedStep) : [];
      const steps = await explore(job.video, credentials, knownSteps);
      await produceVideo(job, steps, credentials, true);
    }
    console.log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'The worker hit an unknown error';
    const message = (stripVTControlCharacters(rawMessage).split('\n')[0] ?? rawMessage).trim();
    console.error('Job failed', error);
    await failJob(job.jobID, message.slice(0, 300)).catch((failError) =>
      console.error('Could not mark the job failed', failError)
    );
  }
}
