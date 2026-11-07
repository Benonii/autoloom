import { useAction, useQuery } from 'convex/react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useSearchParameter } from '@/lib/hooks';
import { readHostname } from '@/lib/steps';

import type { FormEvent } from 'react';

interface LoginLinkScreenProps {
  videoID: string;
}

export function LoginLinkScreen({ videoID }: LoginLinkScreenProps) {
  const loginToken = useSearchParameter('token');
  const request = useQuery(api.videos.readLoginRequest, loginToken ? { videoID, loginToken } : 'skip');
  const addLogin = useAction(api.videos.addLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await addLogin({ videoID, loginToken, email, password });
      setPassword('');
      setIsSent(true);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <AppShell>
        <PageTitle
          title='Recording started'
          description='Your login is encrypted and only typed into the app by the recorder. You can close this tab. Your agent will send you the video.'
        />
      </AppShell>
    );
  }
  if (request === undefined && loginToken) return <AppShell>{null}</AppShell>;
  if (!request?.isOpen) {
    return (
      <AppShell>
        <PageTitle
          title='This login link has expired'
          description='It was already used, or the address is not complete. Ask your agent for a new one.'
        />
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageTitle
        title='Add a test login'
        description={`Your agent is recording "${request.title}" on ${readHostname(request.appURL)}. It needs a login to get in.`}
      />
      <form
        onSubmit={submit}
        className='mx-auto flex max-w-xl flex-col gap-5 rounded-3xl border bg-card p-4 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.45)] sm:p-7'
      >
        <Field>
          <FieldLabel className='font-bold'>
            <KeyRound className='size-4 text-primary' />
            Test account email
          </FieldLabel>
          <Input
            size='lg'
            type='email'
            name='email'
            required
            autoComplete='off'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className='*:text-xs'
          />
        </Field>
        <Field>
          <FieldLabel className='font-bold'>Password</FieldLabel>
          <Input
            size='lg'
            type='password'
            name='password'
            required
            autoComplete='new-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className='*:text-xs'
          />
        </Field>
        <p className='flex gap-2 rounded-2xl bg-muted p-3.5 text-[0.7rem] leading-relaxed text-muted-foreground'>
          <ShieldCheck className='mt-0.5 size-4 shrink-0 text-primary' />
          This goes straight to Autoloom, encrypted. Your AI agent never sees it, and it never shows up in the video.
        </p>
        {errorMessage && (
          <p role='alert' className='rounded-2xl bg-[#fff1e8] px-4 py-3 text-xs font-semibold text-destructive'>
            {errorMessage}
          </p>
        )}
        <Button type='submit' size='xl' disabled={isSubmitting} className='h-12 rounded-2xl text-xs font-bold'>
          {isSubmitting ? 'Starting' : 'Start recording'}
        </Button>
      </form>
    </AppShell>
  );
}
