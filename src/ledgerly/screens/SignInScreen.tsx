import { useState } from 'react';

import { useLedgerly } from '@/ledgerly/store';
import { LedgerButton, TextField } from '@/ledgerly/ui';

import type { FormEvent } from 'react';

export function SignInScreen() {
  const { update } = useLedgerly();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes('@') || password !== 'launchday') {
      setErrorMessage('That email and password do not match an account.');
      return;
    }
    update((current) => ({ ...current, userEmail: email }));
  }

  return (
    <div className='grid min-h-dvh place-items-center bg-[#f8fafc] p-4'>
      <form
        onSubmit={submit}
        className='flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm'
      >
        <p className='flex items-center gap-2 text-lg font-extrabold'>
          <span className='grid size-7 place-items-center rounded-lg bg-[#15803d] text-sm text-white'>L</span>
          Ledgerly
        </p>
        <h1 className='text-2xl font-bold'>Sign in to your workspace</h1>
        <TextField label='Email' type='email' value={email} onChange={setEmail} />
        <TextField label='Password' type='password' value={password} onChange={setPassword} />
        {errorMessage && (
          <p role='alert' className='text-sm text-[#b91c1c]'>
            {errorMessage}
          </p>
        )}
        <LedgerButton type='submit'>Sign in</LedgerButton>
      </form>
    </div>
  );
}
