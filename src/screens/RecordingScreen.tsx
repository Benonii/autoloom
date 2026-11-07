import { useQuery } from 'convex/react';

import { AppShell } from '@/components/AppShell';
import { BrowserFrame } from '@/components/BrowserFrame';
import { LiveGlow } from '@/components/LiveGlow';
import { PageTitle } from '@/components/PageTitle';
import { StepList } from '@/components/StepList';
import { TealDither } from '@/components/TealDither';
import { api } from '@/lib/convexApi';
import { useNow } from '@/lib/hooks';
import { readHostname, toWalkthroughSteps } from '@/lib/steps';

import type { VideoScreenProps } from '@/types';

const recorderOfflineMilliseconds = 45_000;

interface QueuePlace {
  isQueued: boolean;
  videosAhead: number;
  recorderLastSeenAt: number | null;
}

function readWaitingLabel(place: QueuePlace | undefined, now: number): string | null {
  if (!place?.isQueued) return null;
  const isOffline = place.recorderLastSeenAt === null || now - place.recorderLastSeenAt > recorderOfflineMilliseconds;
  if (isOffline) return 'The recorder is offline. Your video starts as soon as it is back.';
  if (place.videosAhead === 1) return 'Waiting in line, 1 video ahead';
  if (place.videosAhead > 1) return `Waiting in line, ${place.videosAhead} videos ahead`;
  return 'Starting the recorder';
}

export function RecordingScreen({ video, steps }: VideoScreenProps) {
  const place = useQuery(api.queue.readPlace, { videoID: video.id });
  const now = useNow(5000);
  const waitingLabel = readWaitingLabel(place, now);
  const walkthroughSteps = toWalkthroughSteps(steps, video.status);
  const doneCount = walkthroughSteps.filter((step) => step.status === 'done').length;
  const isRendering = video.status === 'rendering';
  const progressLabel = waitingLabel
    ? 'Waiting to start'
    : isRendering
      ? 'Adding voice and zooms'
      : steps.length === 0
        ? 'Exploring your app'
        : `Step ${Math.min(doneCount + 1, steps.length)} of ${steps.length}`;
  return (
    <AppShell>
      <PageTitle
        title={isRendering ? 'Putting your video together' : 'Recording your video'}
        description={video.goal}
      />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8'>
        <div className='relative isolate overflow-hidden rounded-[2rem] bg-deep p-3 sm:p-5'>
          <TealDither shape='dots' className='-z-20 opacity-30' />
          <LiveGlow />
          <BrowserFrame
            url={readHostname(video.appURL)}
            isLive={!isRendering && !waitingLabel}
            className='relative z-10'
          >
            {video.liveFrameURL ? (
              <img
                src={video.liveFrameURL}
                alt='What the agent sees right now'
                className='aspect-video w-full object-cover'
              />
            ) : (
              <div className='grid aspect-video w-full place-items-center bg-muted px-6 text-center text-muted-foreground'>
                {waitingLabel ?? 'Opening your app'}
              </div>
            )}
          </BrowserFrame>
        </div>
        <aside className='flex flex-col gap-4'>
          <p aria-live='polite' className='px-3 text-lg font-bold sm:text-xl'>
            {progressLabel}
          </p>
          <StepList steps={walkthroughSteps} />
        </aside>
      </div>
    </AppShell>
  );
}
