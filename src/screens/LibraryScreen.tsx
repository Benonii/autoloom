import { useQuery } from 'convex/react';
import { Clock, Plus } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/convexApi';
import { useDeviceID } from '@/lib/hooks';
import { formatTimestamp, readHostname } from '@/lib/steps';

import type { PublicVideo } from '@/types';

const statusLabels: Record<PublicVideo['status'], string | null> = {
  waitingForLogin: 'Needs a login',
  recording: 'Recording',
  rendering: 'Rendering',
  stuck: 'Needs a hint',
  failed: 'Failed',
  ready: null
};

export function LibraryScreen() {
  const deviceID = useDeviceID();
  const videos = useQuery(api.videos.listMine, deviceID ? { deviceID } : 'skip');
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
      {videos && videos.length > 0 && (
        <ul className='flex flex-col divide-y rounded-3xl border bg-card'>
          {videos.map((video) => {
            const statusLabel = statusLabels[video.status];
            return (
              <li key={video.id}>
                <a
                  href={`/videos/${video.id}`}
                  className='flex flex-col gap-1 p-4 transition-colors hover:bg-muted sm:p-5'
                >
                  <span className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-bold sm:text-base'>{video.title}</span>
                    {statusLabel && (
                      <Badge
                        variant={
                          video.status === 'failed' || video.status === 'stuck' || video.status === 'waitingForLogin'
                            ? 'warning'
                            : 'secondary'
                        }
                        size='lg'
                      >
                        {statusLabel}
                      </Badge>
                    )}
                  </span>
                  <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <Clock className='size-3.5' />
                    {video.durationSeconds ? formatTimestamp(video.durationSeconds) : 'Not ready'},{' '}
                    {readHostname(video.appURL)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
