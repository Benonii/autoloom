import { useMutation } from 'convex/react';
import { Check, Clock, Globe, Link2, ListOrdered, RefreshCw, RotateCcw, ScrollText } from 'lucide-react';
import { useRef, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { ChapterList } from '@/components/ChapterList';
import { ScriptEditor } from '@/components/ScriptEditor';
import { TealDither } from '@/components/TealDither';
import { TealMesh } from '@/components/TealMesh';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VoicePicker } from '@/components/VoicePicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useDeviceID } from '@/lib/hooks';
import { formatTimestamp, readHostname } from '@/lib/steps';

import type { PublicStep, VideoScreenProps } from '@/types';

export function ReadyScreen({ video, steps }: VideoScreenProps) {
  const deviceID = useDeviceID();
  const rerender = useMutation(api.videos.rerender);
  const rerecord = useMutation(api.videos.rerecord);
  const playerReference = useRef<HTMLVideoElement>(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(video.voiceoverEnabled);
  const [voiceID, setVoiceID] = useState(video.voiceID);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isRendering = video.status === 'rendering';
  const hasVoiceChanges = voiceoverEnabled !== video.voiceoverEnabled || voiceID !== video.voiceID;
  const hasChanges = video.hasUnrenderedEdits || hasVoiceChanges;
  const activeStepID = readActiveStepID(steps, currentSeconds);

  function seekTo(step: PublicStep) {
    const player = playerReference.current;
    if (!player) return;
    player.currentTime = step.startSeconds;
    void player.play();
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${video.id}`);
    setIsLinkCopied(true);
    window.setTimeout(() => setIsLinkCopied(false), 2000);
  }

  async function run(change: () => Promise<unknown>) {
    try {
      setErrorMessage(null);
      await change();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    }
  }

  return (
    <AppShell>
      <div className='mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl'>{video.title}</h1>
          <p className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:text-base'>
            <span className='flex items-center gap-1.5'>
              <Globe className='size-4' />
              {readHostname(video.appURL)}
            </span>
            <span className='flex items-center gap-1.5'>
              <Clock className='size-4' />
              {formatTimestamp(video.durationSeconds ?? 0)}
            </span>
            <span className='flex items-center gap-1.5'>
              <ListOrdered className='size-4' />
              {steps.length} steps
            </span>
          </p>
        </div>
        <Button
          size='xl'
          variant={hasChanges ? 'outline' : 'default'}
          className='rounded-2xl font-bold'
          onClick={copyShareLink}
        >
          {isLinkCopied ? <Check /> : <Link2 />}
          {isLinkCopied ? 'Link copied' : 'Copy share link'}
        </Button>
      </div>
      {isRendering && (
        <div
          aria-live='polite'
          className='mb-6 flex flex-col gap-1 rounded-2xl bg-tint p-4 text-tint-foreground sm:flex-row sm:items-center sm:gap-6'
        >
          <p className='font-bold'>Re-rendering with your changes</p>
          <p className='text-sm'>Your share link keeps the old version until it’s done.</p>
        </div>
      )}
      <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <div className='relative isolate overflow-hidden rounded-[2rem] p-3 sm:p-6'>
          <TealMesh className='-z-20' />
          <TealDither shape='simplex' className='-z-10 opacity-40 mix-blend-screen' />
          <VideoPlayer
            ref={playerReference}
            videoURL={video.videoURL}
            title={video.title}
            isRevealed={!isRendering}
            onTimeChange={setCurrentSeconds}
          />
        </div>
        <section aria-labelledby='chapters'>
          <h2 id='chapters' className='mb-2 px-3 text-lg font-bold'>
            Chapters
          </h2>
          <ChapterList steps={steps} activeStepID={activeStepID} onSelect={seekTo} />
        </section>
      </div>
      <section aria-labelledby='script' className='mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <div>
          <h2 id='script' className='flex items-center gap-2 text-xl font-bold sm:text-2xl'>
            <ScrollText className='size-5 text-primary' />
            Script
          </h2>
          <p className='mb-4 mt-1 text-[0.95rem] text-muted-foreground'>
            Edit any line and re-render. Nothing gets recorded again.
          </p>
          <ScriptEditor steps={steps} isDisabled={isRendering} />
        </div>
        <div className='flex flex-col gap-4 lg:pt-14'>
          <div className='flex flex-col gap-4 rounded-2xl bg-muted p-4'>
            <div className='flex items-center gap-3 font-semibold'>
              <Switch
                id='voiceover'
                checked={voiceoverEnabled}
                onCheckedChange={setVoiceoverEnabled}
                disabled={isRendering}
              />
              <Label htmlFor='voiceover' className='text-base'>
                Voiceover
              </Label>
            </div>
            <VoicePicker value={voiceID} onChange={setVoiceID} isDisabled={isRendering || !voiceoverEnabled} />
            <p className='text-sm text-muted-foreground'>Off gives you captions only.</p>
          </div>
          {errorMessage && (
            <p role='alert' className='text-sm font-semibold text-destructive'>
              {errorMessage}
            </p>
          )}
          <Button
            size='lg'
            variant={hasChanges ? 'default' : 'outline'}
            disabled={isRendering}
            className='rounded-2xl font-bold'
            onClick={() => run(() => rerender({ deviceID, videoID: video.id, voiceoverEnabled, voiceID }))}
          >
            <RefreshCw />
            {isRendering ? 'Re-rendering' : 'Re-render video'}
          </Button>
          <Button
            size='lg'
            variant='ghost'
            disabled={isRendering}
            className='rounded-2xl text-muted-foreground'
            onClick={() => run(() => rerecord({ deviceID, videoID: video.id }))}
          >
            <RotateCcw />
            Re-record from the app
          </Button>
        </div>
      </section>
    </AppShell>
  );
}

function readActiveStepID(steps: PublicStep[], currentSeconds: number): string | null {
  const startedSteps = steps.filter((step) => step.startSeconds <= currentSeconds);
  return startedSteps.at(-1)?.id ?? steps[0]?.id ?? null;
}
