import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { makeCancelSignal, renderMedia, selectComposition } from '@remotion/renderer';

import { readJobSignal, throwIfStopped } from '@worker/cancel';

import type { Narration, Take, WalkthroughProps, WalkthroughSegment } from '@worker/types';

const entryPoint = new URL('./remotion/index.ts', import.meta.url).pathname;
const captionPaddingSeconds = 0.5;

export function buildSegments(
  take: Take,
  narrations: Narration[]
): { segments: WalkthroughSegment[]; totalSeconds: number } {
  const segments: WalkthroughSegment[] = [];
  let outputSeconds = 0;
  const firstStart = take.segments[0]?.startSeconds ?? take.totalSeconds;
  if (firstStart > 0) {
    segments.push({
      text: '',
      audioFile: null,
      takeStartSeconds: 0,
      takeEndSeconds: firstStart,
      outputStartSeconds: 0,
      outputDurationSeconds: firstStart,
      box: null
    });
    outputSeconds = firstStart;
  }
  take.segments.forEach((takeSegment, index) => {
    const narration = narrations[takeSegment.stepIndex];
    const takeEndSeconds = take.segments[index + 1]?.startSeconds ?? take.totalSeconds;
    const takeLength = takeEndSeconds - takeSegment.startSeconds;
    const outputDurationSeconds = Math.max(takeLength, (narration?.durationSeconds ?? 0) + captionPaddingSeconds);
    segments.push({
      text: narration?.text ?? '',
      audioFile: narration?.audioPath ? path.basename(narration.audioPath) : null,
      takeStartSeconds: takeSegment.startSeconds,
      takeEndSeconds,
      outputStartSeconds: outputSeconds,
      outputDurationSeconds,
      box: takeSegment.box
    });
    outputSeconds += outputDurationSeconds;
  });
  return { segments, totalSeconds: outputSeconds };
}

export async function renderWalkthrough(take: Take, narrations: Narration[], directory: string) {
  const { segments, totalSeconds } = buildSegments(take, narrations);
  const inputProps: WalkthroughProps = {
    takeFile: path.basename(take.videoPath),
    viewport: take.viewport,
    segments,
    totalSeconds
  };
  const serveUrl = await bundle({ entryPoint, publicDir: directory });
  const composition = await selectComposition({ serveUrl, id: 'Walkthrough', inputProps });
  const outputPath = path.join(directory, 'walkthrough.mp4');
  throwIfStopped();
  const { cancelSignal, cancel } = makeCancelSignal();
  readJobSignal()?.addEventListener('abort', cancel, { once: true });
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    concurrency: 4,
    cancelSignal
  });
  return { outputPath, segments, totalSeconds };
}
