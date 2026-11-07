export type StepKind = 'navigate' | 'click' | 'type';

export type ValueSource = 'text' | 'email' | 'password';

export interface StepBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlannedStep {
  id?: string;
  kind: StepKind;
  title: string;
  narration: string;
  selector?: string;
  value?: string;
}

export interface JobVideo {
  id: string;
  appURL: string;
  goal: string;
  voiceoverEnabled: boolean;
  voiceID: string;
  hasCredentials: boolean;
  hint: string | null;
}

export interface JobStep {
  id: string;
  order: number;
  kind: StepKind;
  title: string;
  narration: string;
  selector: string | null;
  value: string | null;
}

export interface ClaimedJob {
  jobID: string;
  kind: 'record' | 'render' | 'rerecord' | 'launch';
  video: JobVideo;
  steps: JobStep[];
}

export interface Credentials {
  email: string;
  password: string;
}

export interface PageElement {
  number: number;
  role: string;
  name: string;
  tag: string;
  id: string;
  placeholder: string;
  inputName: string;
  testID: string;
  cssPath: string;
  isTextInput: boolean;
  isPasswordInput: boolean;
}

export interface PlannerDecision {
  status: 'act' | 'done' | 'stuck';
  stepTitle: string;
  narration: string;
  action: 'click' | 'type' | 'none';
  elementNumber: number;
  valueSource: ValueSource;
  text: string;
  question: string;
}

export interface TakeSegment {
  stepIndex: number;
  startSeconds: number;
  endSeconds: number;
  box: StepBox | null;
}

export interface Take {
  videoPath: string;
  totalSeconds: number;
  viewport: { width: number; height: number };
  segments: TakeSegment[];
}

export interface Narration {
  stepIndex: number;
  text: string;
  audioPath: string | null;
  durationSeconds: number;
}

export interface WalkthroughSegment {
  text: string;
  audioFile: string | null;
  takeStartSeconds: number;
  takeEndSeconds: number;
  outputStartSeconds: number;
  outputDurationSeconds: number;
  box: StepBox | null;
}

export type WalkthroughProps = {
  takeFile: string;
  viewport: { width: number; height: number };
  segments: WalkthroughSegment[];
  totalSeconds: number;
};

export interface LaunchCopy {
  headline: string;
  closingLine: string;
  scenes: { stepIndex: number; caption: string }[];
}

export interface LaunchScene {
  caption: string;
  takeStartSeconds: number;
  takeEndSeconds: number;
  box: StepBox | null;
}

export type LaunchProps = {
  takeFile: string;
  musicFile: string | null;
  viewport: { width: number; height: number };
  hostname: string;
  headline: string;
  closingLine: string;
  scenes: LaunchScene[];
  finalFrameSeconds: number;
};
