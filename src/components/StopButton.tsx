import { useMutation } from 'convex/react';
import { Square } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useDeviceID } from '@/lib/hooks';

import type { PublicVideo } from '@/types';

interface StopButtonProps {
  videoID: PublicVideo['id'];
  label?: string;
}

export function StopButton({ videoID, label = 'Stop' }: StopButtonProps) {
  const deviceID = useDeviceID();
  const stop = useMutation(api.videos.stop);
  const [isStopping, setIsStopping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function stopVideo() {
    setIsStopping(true);
    setErrorMessage(null);
    try {
      await stop({ deviceID, videoID });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
      setIsStopping(false);
    }
  }

  return (
    <div className='flex flex-col items-center gap-2'>
      <Button
        variant='outline'
        size='lg'
        className='rounded-2xl border-red-600 font-bold text-red-600 hover:bg-red-50'
        loading={isStopping}
        onClick={stopVideo}
      >
        <Square />
        {label}
      </Button>
      {errorMessage && (
        <p role='alert' className='text-xs font-semibold text-destructive'>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
