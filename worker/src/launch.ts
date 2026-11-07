import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

import { writeLaunchMusic } from '@worker/music';
import { launchTiming } from '@worker/remotion/launchTiming';

import type { LaunchCopy, LaunchProps, Take } from '@worker/types';

const entryPoint = new URL('./remotion/index.ts', import.meta.url).pathname;
const leadInSeconds = 0.3;

function readHostname(appURL: string): string {
  try {
    return new URL(appURL).hostname.replace(/^www\./, '');
  } catch {
    return appURL;
  }
}

export function buildLaunchProps(take: Take, copy: LaunchCopy, appURL: string, musicFile: string | null): LaunchProps {
  const scenes = copy.scenes.flatMap((scene) => {
    const segment = take.segments.find((candidate) => candidate.stepIndex === scene.stepIndex);
    if (!segment) return [];
    const takeStartSeconds = Math.max(0, segment.startSeconds - leadInSeconds);
    return [
      {
        caption: scene.caption,
        takeStartSeconds,
        takeEndSeconds: Math.min(
          take.totalSeconds,
          Math.max(segment.endSeconds, takeStartSeconds + launchTiming.sceneSeconds)
        ),
        box: segment.box
      }
    ];
  });
  const lastSegment = take.segments.at(-1);
  return {
    takeFile: path.basename(take.videoPath),
    musicFile,
    viewport: take.viewport,
    hostname: readHostname(appURL),
    headline: copy.headline,
    closingLine: copy.closingLine,
    scenes,
    finalFrameSeconds: Math.max(0, (lastSegment?.endSeconds ?? take.totalSeconds) - 0.1)
  };
}

export async function renderLaunch(take: Take, copy: LaunchCopy, appURL: string, directory: string) {
  const musicFile = 'launch-music.wav';
  const sceneCount = buildLaunchProps(take, copy, appURL, null).scenes.length;
  await writeLaunchMusic(path.join(directory, musicFile), { ...launchTiming, sceneCount });
  const inputProps = buildLaunchProps(take, copy, appURL, musicFile);
  const serveUrl = await bundle({ entryPoint, publicDir: directory });
  const composition = await selectComposition({ serveUrl, id: 'Launch', inputProps });
  const outputPath = path.join(directory, 'launch.mp4');
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: outputPath, inputProps, concurrency: 4 });
  return outputPath;
}
