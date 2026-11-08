import { useMutation } from 'convex/react';
import { RotateCcw } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/convexApi';
import { useDeviceID } from '@/lib/hooks';

import type { VideoScreenProps } from '@/types';

const stoppedMessage = 'You stopped this video.';

export function FailedScreen({ video }: VideoScreenProps) {
  const deviceID = useDeviceID();
  const rerecord = useMutation(api.videos.rerecord);
  return (
    <AppShell>
      <PageTitle
        title={video.errorMessage === stoppedMessage ? 'Video stopped' : 'We could not make this video'}
        description={video.errorMessage ?? 'Something went wrong while recording.'}
      />
      <div className='flex justify-center'>
        <Button size='xl' className='rounded-2xl font-bold' onClick={() => rerecord({ deviceID, videoID: video.id })}>
          <RotateCcw />
          Try again
        </Button>
      </div>
    </AppShell>
  );
}
