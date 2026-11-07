import type { FunctionReturnType } from 'convex/server';

import type { api } from '@/lib/convexApi';

export type StepStatus = 'done' | 'active' | 'waiting' | 'stuck';

export type StepKind = 'navigate' | 'click' | 'type';

export type PublicVideo = NonNullable<FunctionReturnType<typeof api.videos.get>>;

export type PublicStep = FunctionReturnType<typeof api.steps.listForVideo>[number];

export interface WalkthroughStep extends PublicStep {
  status: StepStatus;
}

export interface VoiceOption {
  value: string;
  label: string;
}

export interface VideoScreenProps {
  video: PublicVideo;
  steps: PublicStep[];
}
