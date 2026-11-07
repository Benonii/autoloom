import { useMutation } from 'convex/react';
import { RotateCcw } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/convexApi';
import { useDeviceID } from '@/lib/hooks';

import type { VideoScreenProps } from '@/types';

export function FailedScreen({ video }: VideoScreenProps) {
  const deviceID = useDeviceID();
  const rerecord = useMutation(api.videos.rerecord);
  return (
    <AppShell>
      <PageTitle
        title='We could not make this video'
        description={video.errorMessage ?? 'Something went wrong while recording.'}
      />
      <Button size='xl' className='rounded-2xl font-bold' onClick={() => rerecord({ deviceID, videoID: video.id })}>
        <RotateCcw />
        Try again
      </Button>
    </AppShell>
  );
}
