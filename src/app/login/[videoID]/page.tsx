'use client';

import { LoginLinkScreen } from '@/screens/LoginLinkScreen';

import type { PageProps } from '@farm.js/core';

export default function LoginLinkPage({ params = {} }: PageProps) {
  return <LoginLinkScreen videoID={String(params.videoID ?? '')} />;
}
