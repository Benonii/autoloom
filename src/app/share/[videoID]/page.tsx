'use client';

import { ShareScreen } from '@/screens/ShareScreen';

import type { PageProps } from '@farm.js/core';

export default function SharePage({ params = {} }: PageProps) {
  return <ShareScreen videoID={String(params.videoID ?? '')} />;
}
