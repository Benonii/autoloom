import { useQuery } from 'convex/react';

import { AppShell } from '@/components/AppShell';
import { PageTitle } from '@/components/PageTitle';
import { api } from '@/lib/convexApi';
import { useDeviceID } from '@/lib/hooks';
import { FailedScreen } from '@/screens/FailedScreen';
import { ReadyScreen } from '@/screens/ReadyScreen';
import { RecordingScreen } from '@/screens/RecordingScreen';
import { StuckScreen } from '@/screens/StuckScreen';

interface VideoScreenRouteProps {
  videoID: string;
}

export function VideoScreen({ videoID }: VideoScreenRouteProps) {
  const deviceID = useDeviceID();
  const video = useQuery(api.videos.get, { videoID });
  const steps = useQuery(api.steps.listForVideo, { videoID });
  const isOwner = useQuery(api.videos.isOwner, deviceID ? { videoID, deviceID } : 'skip');
  if (video === undefined || steps === undefined || isOwner === undefined) return <AppShell>{null}</AppShell>;
  if (video === null || !isOwner) {
    return (
      <AppShell>
        <PageTitle title='Video not found' description='It may have been deleted, or it belongs to someone else.' />
      </AppShell>
    );
  }
  if (video.status === 'stuck') return <StuckScreen video={video} steps={steps} />;
  if (video.status === 'failed') return <FailedScreen video={video} steps={steps} />;
  if (video.status === 'recording' || (video.status === 'rendering' && !video.videoURL)) {
    return <RecordingScreen video={video} steps={steps} />;
  }
  return <ReadyScreen video={video} steps={steps} />;
}
