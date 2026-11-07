'use client';

import { VideoScreen } from '@/screens/VideoScreen';

import type { PageProps } from '@farm.js/core';

export default function VideoPage({ params = {} }: PageProps) {
  return <VideoScreen videoID={String(params.videoID ?? '')} />;
}
