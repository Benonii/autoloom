import { useQuery } from 'convex/react';
import { useRef, useState } from 'react';

import { ChapterList } from '@/components/ChapterList';
import { PageTitle } from '@/components/PageTitle';
import { TealDither } from '@/components/TealDither';
import { TealMesh } from '@/components/TealMesh';
import { VideoPlayer } from '@/components/VideoPlayer';
import { api } from '@/lib/convexApi';
import { formatTimestamp, readHostname } from '@/lib/steps';

import type { PublicStep } from '@/types';

interface ShareScreenProps {
  videoID: string;
}

export function ShareScreen({ videoID }: ShareScreenProps) {
  const video = useQuery(api.videos.get, { videoID });
  const steps = useQuery(api.steps.listForVideo, { videoID });
  const playerReference = useRef<HTMLVideoElement>(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  if (video === undefined || steps === undefined) return null;
  if (video === null || !video.videoURL) {
    return (
      <div className='mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-12'>
        <PageTitle title='This video is not available' description='The link may be wrong, or the video was deleted.' />
        <a href='/' className='font-bold text-foreground underline underline-offset-4'>
          Go to Autoloom
        </a>
      </div>
    );
  }
  const startedSteps = steps.filter((step) => step.startSeconds <= currentSeconds);
  const activeStepID = startedSteps.at(-1)?.id ?? null;

  function seekTo(step: PublicStep) {
    const player = playerReference.current;
    if (!player) return;
    player.currentTime = step.startSeconds;
    void player.play();
  }

  return (
    <div className='mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-12'>
      <h1 className='text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl'>{video.title}</h1>
      <p className='mb-6 mt-2 text-muted-foreground sm:mb-8'>
        A {formatTimestamp(video.durationSeconds ?? 0)} walkthrough of {readHostname(video.appURL)}
      </p>
      <div className='relative isolate overflow-hidden rounded-[2rem] p-3 sm:p-6'>
        <TealMesh className='-z-20' />
        <TealDither shape='simplex' className='-z-10 opacity-40 mix-blend-screen' />
        <VideoPlayer
          ref={playerReference}
          videoURL={video.videoURL}
          title={video.title}
          onTimeChange={setCurrentSeconds}
        />
      </div>
      <div className='mt-8 grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]'>
        <section aria-labelledby='share-chapters'>
          <h2 id='share-chapters' className='mb-2 px-3 text-lg font-bold'>
            Chapters
          </h2>
          <ChapterList steps={steps} activeStepID={activeStepID} onSelect={seekTo} />
        </section>
        <section aria-labelledby='share-transcript'>
          <h2 id='share-transcript' className='mb-2 text-lg font-bold'>
            Transcript
          </h2>
          <div className='flex flex-col gap-3 leading-relaxed text-muted-foreground'>
            {steps.map((step) => (
              <p key={step.id}>{step.narration}</p>
            ))}
          </div>
        </section>
      </div>
      <p className='mt-12 text-sm text-muted-foreground'>
        Made with{' '}
        <a href='/' className='font-bold text-foreground underline underline-offset-4'>
          Autoloom
        </a>
        , no recording needed.
      </p>
    </div>
  );
}
