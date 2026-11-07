import { useMutation } from 'convex/react';
import { Lightbulb } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { BrowserFrame } from '@/components/BrowserFrame';
import { PageTitle } from '@/components/PageTitle';
import { StepList } from '@/components/StepList';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useDeviceID } from '@/lib/hooks';
import { readHostname, toWalkthroughSteps } from '@/lib/steps';

import type { VideoScreenProps } from '@/types';
import type { FormEvent } from 'react';

export function StuckScreen({ video, steps }: VideoScreenProps) {
  const deviceID = useDeviceID();
  const answerStuck = useMutation(api.videos.answerStuck);
  const [hint, setHint] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const walkthroughSteps = toWalkthroughSteps(steps, video.status);
  const stuckIndex = walkthroughSteps.findIndex((step) => step.status === 'stuck');
  const title = stuckIndex >= 0 ? `Stuck on step ${stuckIndex + 1}` : 'The agent is stuck';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await answerStuck({ deviceID, videoID: video.id, hint });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    }
  }

  return (
    <AppShell>
      <PageTitle title={title} description={video.stuckQuestion ?? 'The agent could not find its next step.'} />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8'>
        <div className='flex flex-col gap-6'>
          <BrowserFrame url={readHostname(video.appURL)}>
            {video.liveFrameURL ? (
              <img
                src={video.liveFrameURL}
                alt='Where the agent got stuck'
                className='aspect-video w-full object-cover'
              />
            ) : (
              <div className='aspect-video w-full bg-muted' />
            )}
          </BrowserFrame>
          <form onSubmit={submit} className='flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6'>
            <Field>
              <FieldLabel className='text-base font-bold sm:text-lg'>
                <Lightbulb className='size-4 text-primary' />
                Where is it now?
              </FieldLabel>
              <Input
                size='lg'
                name='hint'
                required
                placeholder='It moved under the Share button'
                value={hint}
                onChange={(event) => setHint(event.target.value)}
                className='text-base'
              />
              <FieldDescription>The agent tries again with your hint. Finished steps are kept.</FieldDescription>
            </Field>
            {errorMessage && (
              <p role='alert' className='text-sm font-semibold text-destructive'>
                {errorMessage}
              </p>
            )}
            <Button type='submit' size='xl' className='rounded-2xl font-bold sm:self-start'>
              Try again with hint
            </Button>
          </form>
        </div>
        <aside>
          <StepList steps={walkthroughSteps} />
        </aside>
      </div>
    </AppShell>
  );
}
