import { useQuery } from 'convex/react';
import { Clock, Plus } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/convexApi';
import { useDeviceID } from '@/lib/hooks';
import { formatTimestamp, readHostname } from '@/lib/steps';

import type { FunctionReturnType } from 'convex/server';

type LibraryVideo = FunctionReturnType<typeof api.videos.listMine>[number];

const statusLabels: Record<LibraryVideo['status'], string | null> = {
  waitingForLogin: 'Needs a login',
  recording: 'Recording',
  rendering: 'Rendering',
  stuck: 'Needs a hint',
  failed: 'Failed',
  ready: null
};

const activeStatuses = new Set<LibraryVideo['status']>(['waitingForLogin', 'recording', 'rendering', 'stuck']);

function readStatusLabel(video: LibraryVideo): string | null {
  if (video.videosAhead === null) return statusLabels[video.status];
  if (video.videosAhead === 0) return 'Up next';
  return `Queued, ${video.videosAhead} ahead`;
}

function isWorking(video: LibraryVideo): boolean {
  return video.videosAhead === null && (video.status === 'recording' || video.status === 'rendering');
}

function needsAttention(video: LibraryVideo): boolean {
  return video.status === 'failed' || video.status === 'stuck' || video.status === 'waitingForLogin';
}

function VideoRow({ video }: { video: LibraryVideo }) {
  const statusLabel = readStatusLabel(video);
  return (
    <li>
      <a href={`/videos/${video.id}`} className='flex flex-col gap-1 p-4 transition-colors hover:bg-muted sm:p-5'>
        <span className='flex flex-wrap items-center gap-2'>
          <span className='text-sm font-bold sm:text-base'>{video.title}</span>
          {statusLabel && (
            <Badge variant={needsAttention(video) ? 'warning' : 'secondary'} size='lg'>
              {isWorking(video) && <Spinner className='size-3' />}
              {statusLabel}
            </Badge>
          )}
        </span>
        <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <Clock className='size-3.5' />
          {video.durationSeconds ? formatTimestamp(video.durationSeconds) : 'Not ready'}, {readHostname(video.appURL)}
        </span>
      </a>
    </li>
  );
}

function VideoSection({ title, videos }: { title: string; videos: LibraryVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-sm font-bold text-muted-foreground'>
        {title} ({videos.length})
      </h2>
      <ul className='flex flex-col divide-y rounded-3xl border bg-card'>
        {videos.map((video) => (
          <VideoRow key={video.id} video={video} />
        ))}
      </ul>
    </section>
  );
}

export function LibraryScreen() {
  const deviceID = useDeviceID();
  const videos = useQuery(api.videos.listMine, deviceID ? { deviceID } : 'skip');
  const activeVideos = videos?.filter((video) => activeStatuses.has(video.status)) ?? [];
  const finishedVideos = videos?.filter((video) => !activeStatuses.has(video.status)) ?? [];
  return (
    <AppShell isCreateHidden>
      <div className='mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10'>
        <h1 className='text-xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-3xl'>Your videos</h1>
        <Button size='xl' className='rounded-2xl font-bold' render={<a href='/' />}>
          <Plus />
          New video
        </Button>
      </div>
      {videos?.length === 0 && (
        <p className='rounded-3xl border bg-card p-6 text-muted-foreground'>No videos yet. Make your first one.</p>
      )}
      <div className='flex flex-col gap-8'>
        <VideoSection title='In progress' videos={activeVideos} />
        <VideoSection title='Finished' videos={finishedVideos} />
      </div>
    </AppShell>
  );
}
