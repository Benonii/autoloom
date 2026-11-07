import { useAction } from 'convex/react';
import { ChevronDown, Clapperboard, KeyRound, Link2, Mic, Target } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { TealDither } from '@/components/TealDither';
import { TealMesh } from '@/components/TealMesh';
import { VoicePicker } from '@/components/VoicePicker';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useDeviceID } from '@/lib/hooks';
import { defaultVoiceID } from '@/lib/voices';

import type { FormEvent } from 'react';

export function CreateScreen() {
  const deviceID = useDeviceID();
  const createVideo = useAction(api.videos.create);
  const [appURL, setAppURL] = useState('');
  const [goal, setGoal] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [voiceID, setVoiceID] = useState(defaultVoiceID);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deviceID) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const videoID = await createVideo({
        deviceID,
        appURL,
        goal,
        voiceoverEnabled,
        voiceID,
        email: email || undefined,
        password: password || undefined
      });
      window.location.assign(`/videos/${videoID}`);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell isCreateHidden>
      <div className='mx-auto max-w-2xl pt-1 sm:pt-6'>
        <section className='relative isolate overflow-hidden rounded-[2rem] px-5 pb-16 pt-7 text-white sm:px-10 sm:pb-24 sm:pt-12'>
          <TealMesh className='-z-20' />
          <TealDither className='-z-10 opacity-50 mix-blend-screen [mask-image:linear-gradient(to_left,black_20%,transparent_75%)]' />
          <span className='mb-4 grid size-10 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm sm:size-12'>
            <Clapperboard className='size-5 sm:size-6' />
          </span>
          <h1 className='text-balance text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl'>
            What should we show?
          </h1>
          <p className='mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/85 sm:text-lg'>
            Paste your app’s link and say what to demo. An agent clicks through it and hands you a narrated video.
          </p>
        </section>
        <form
          onSubmit={submit}
          className='relative -mt-10 mx-2 flex flex-col gap-5 rounded-3xl border bg-card p-4 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.45)] sm:-mt-14 sm:mx-6 sm:gap-6 sm:p-7'
        >
          <Field>
            <FieldLabel className='font-bold sm:text-base'>
              <Link2 className='size-4 text-primary' />
              App link
            </FieldLabel>
            <Input
              size='lg'
              name='appURL'
              required
              inputMode='url'
              placeholder='https://your-app.com'
              value={appURL}
              onChange={(event) => setAppURL(event.target.value)}
              className='*:text-base sm:*:h-12 sm:*:text-lg'
            />
          </Field>
          <Field>
            <FieldLabel className='font-bold sm:text-base'>
              <Target className='size-4 text-primary' />
              What should it show?
            </FieldLabel>
            <Textarea
              name='goal'
              required
              placeholder='Show how to invite a teammate'
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className='*:min-h-20 *:text-base sm:*:text-lg'
            />
            <FieldDescription>One task works best, like “invite a teammate”.</FieldDescription>
          </Field>
          <Collapsible className='rounded-2xl border'>
            <CollapsibleTrigger className='flex w-full items-center gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold [&[data-panel-open]>svg:last-child]:rotate-180'>
              <KeyRound className='size-4 text-muted-foreground' />
              <span className='flex-1'>Needs a login?</span>
              <ChevronDown className='size-4 text-muted-foreground transition-transform duration-200' />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <div className='grid gap-4 border-t p-4 sm:grid-cols-2'>
                <Field>
                  <FieldLabel>Test account email</FieldLabel>
                  <Input
                    type='email'
                    name='email'
                    autoComplete='off'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    type='password'
                    name='password'
                    autoComplete='new-password'
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <p className='text-sm leading-relaxed text-muted-foreground sm:col-span-2'>
                  The AI never sees your password. It is stored encrypted, typed in for the agent, and never shown in
                  the video.
                </p>
              </div>
            </CollapsiblePanel>
          </Collapsible>
          <div className='flex flex-col gap-3 rounded-2xl bg-muted p-3.5 sm:flex-row sm:items-center sm:p-4'>
            <div className='flex flex-1 items-center gap-3 text-[0.95rem] font-semibold'>
              <Switch id='voiceover' checked={voiceoverEnabled} onCheckedChange={setVoiceoverEnabled} />
              <Mic className='size-4 text-muted-foreground' />
              <Label htmlFor='voiceover' className='text-[0.95rem]'>
                Voiceover
              </Label>
            </div>
            <VoicePicker value={voiceID} onChange={setVoiceID} isDisabled={!voiceoverEnabled} />
          </div>
          {errorMessage && (
            <p
              role='alert'
              className='rounded-2xl bg-[#fff1e8] px-4 py-3 text-[0.95rem] font-semibold text-destructive'
            >
              {errorMessage}
            </p>
          )}
          <Button
            type='submit'
            size='xl'
            disabled={isSubmitting || !deviceID}
            className='h-12 rounded-2xl text-base font-bold sm:text-lg'
          >
            {isSubmitting ? 'Starting' : 'Record video'}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
