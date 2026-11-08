import { fetchAction, fetchMutation, fetchQuery } from '@farm.js/convex/server';

import { api } from '@/lib/convexApi';
import { defaultVoiceID, voiceOptions } from '@/lib/voices';

import type { FunctionReturnType } from 'convex/server';

type Progress = FunctionReturnType<typeof api.agents.readProgress>;

interface ToolContext {
  agentKey: string;
  origin: string;
}

interface ToolResult {
  text: string;
  data: Record<string, unknown>;
}

interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

const progressWaitMilliseconds = 25_000;
const progressPollMilliseconds = 1500;

const voiceIDs = voiceOptions.map((option) => option.value);

const videoIDProperty = { type: 'string', description: 'The video_id that record_video returned.' };

function readString(input: Record<string, unknown>, name: string): string {
  const value = input[name];
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

function readBoolean(input: Record<string, unknown>, name: string, fallback: boolean): boolean {
  const value = input[name];
  return typeof value === 'boolean' ? value : fallback;
}

function readVoice(input: Record<string, unknown>): string {
  const value = input.voice;
  return typeof value === 'string' && voiceIDs.includes(value) ? value : defaultVoiceID;
}

function readFingerprint(progress: Progress): string {
  const doneCount = progress.steps.filter((step) => step.isDone).length;
  return [progress.video.status, progress.steps.length, doneCount, progress.video.stuckQuestion].join('|');
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readLinks(videoID: string, origin: string) {
  return { watchURL: `${origin}/videos/${videoID}`, shareURL: `${origin}/share/${videoID}` };
}

type QueuePlace = FunctionReturnType<typeof api.queue.readPlace>;

const recorderOfflineMilliseconds = 45_000;

function describeWaiting(place: QueuePlace): string | null {
  if (!place.isQueued) return null;
  const isOffline =
    place.recorderLastSeenAt === null || Date.now() - place.recorderLastSeenAt > recorderOfflineMilliseconds;
  if (isOffline)
    return 'Waiting to start: the Autoloom recorder is offline right now. It starts as soon as it is back.';
  if (place.videosAhead > 0) return `Waiting in line: ${place.videosAhead} video(s) ahead.`;
  return 'Starting the recorder.';
}

function describeProgress(progress: Progress, place: QueuePlace, origin: string): ToolResult {
  const { video, steps } = progress;
  const { watchURL, shareURL } = readLinks(video.id, origin);
  const stepLines = steps.map((step, index) => `${index + 1}. ${step.title}`);
  const stepText = stepLines.length > 0 ? `\n\nSteps so far:\n${stepLines.join('\n')}` : '';
  const data = {
    video_id: video.id,
    status: video.status,
    title: video.title,
    steps: steps.map((step) => step.title),
    watch_url: watchURL
  };
  if (video.status === 'ready') {
    const scriptLines = steps.map((step, index) => `${index + 1}. ${step.narration}`).join('\n');
    return {
      text: `The video is ready (${video.durationSeconds ?? 0}s, ${steps.length} chapters).\n\nShare link: ${shareURL}\n\nScript:\n${scriptLines}\n\nGive the user the share link. Offer to change any script line with edit_script_line and re-render with rerender_video.`,
      data: { ...data, share_url: shareURL, duration_seconds: video.durationSeconds }
    };
  }
  if (video.status === 'stuck') {
    return {
      text: `The recorder is stuck and asks: "${video.stuckQuestion}"${stepText}\n\nIf the question is about signing in, a login, or a password, call request_login and give the user the secure link; never ask for or pass passwords yourself. Otherwise ask the user this question in your own words, then pass their answer to answer_question.`,
      data: { ...data, question: video.stuckQuestion }
    };
  }
  if (video.status === 'failed') {
    return {
      text: `The recording failed: ${video.errorMessage ?? 'unknown error'}${stepText}\n\nTell the user, and suggest a clearer flow or a different link.`,
      data: { ...data, error: video.errorMessage }
    };
  }
  if (video.status === 'waitingForLogin') {
    return {
      text: 'Still waiting for the user to add the test login with the secure link. Remind them, then call get_progress again.',
      data
    };
  }
  const waitingText = describeWaiting(place);
  if (waitingText) {
    return {
      text: `${waitingText} Watch live: ${watchURL}\n\nTell the user, then call get_progress again.`,
      data: { ...data, status: 'queued' }
    };
  }
  const phase = video.status === 'rendering' ? 'Putting the video together' : 'Recording';
  return {
    text: `${phase}. Watch live: ${watchURL}${stepText}\n\nTell the user what just happened in one short line, then call get_progress again.`,
    data
  };
}

const recordVideo: Tool = {
  name: 'record_video',
  title: 'Record a walkthrough video',
  description:
    'Records a narrated walkthrough video of a web app. An AI agent opens the link, clicks through the flow, and Autoloom turns it into a video with zooms, captions, chapters and a voiceover. Before calling, make sure you know three things, and ask the user for any that are missing in one short message: the app link, the exact flow to show (one task, like "create and send an invoice"), and whether the app needs a login. Never ask for passwords in chat: set needs_login and give the user the secure login link this tool returns. If unsure whether it needs a login, set needs_login to true. After calling, keep calling get_progress until the video is ready.',
  inputSchema: {
    type: 'object',
    properties: {
      app_url: { type: 'string', description: 'The web address of the app, like https://acme.com/app' },
      flow: {
        type: 'string',
        description: 'What the video should show, as one task, like "Show how to invite a teammate as an Accountant".'
      },
      needs_login: { type: 'boolean', description: 'True if the flow needs the user to be signed in.' },
      voiceover: { type: 'boolean', description: 'Narrate the video out loud. Defaults to true.' },
      voice: { type: 'string', enum: voiceIDs, description: 'sarah is warm, george is steady, charlie is upbeat.' }
    },
    required: ['app_url', 'flow', 'needs_login']
  },
  run: async (input, { agentKey, origin }) => {
    const needsLogin = readBoolean(input, 'needs_login', false);
    const { videoID, loginToken } = await fetchAction(api.agents.createVideo, {
      agentKey,
      appURL: readString(input, 'app_url'),
      goal: readString(input, 'flow'),
      needsLogin,
      voiceoverEnabled: readBoolean(input, 'voiceover', true),
      voiceID: readVoice(input)
    });
    const { watchURL } = readLinks(videoID, origin);
    if (loginToken) {
      const loginURL = `${origin}/login/${videoID}?token=${loginToken}`;
      return {
        text: `Video created. It needs a test login before recording starts.\n\nSecure login link: ${loginURL}\n\nGive the user this link and tell them to type the login there. The password is encrypted and never reaches you or the recording agent. Then call get_progress.`,
        data: { video_id: videoID, status: 'waitingForLogin', login_url: loginURL, watch_url: watchURL }
      };
    }
    return {
      text: `Recording started. Watch live: ${watchURL}\n\nTell the user it started and share the watch link, then call get_progress.`,
      data: { video_id: videoID, status: 'recording', watch_url: watchURL }
    };
  }
};

const getProgress: Tool = {
  name: 'get_progress',
  title: 'Check on a video',
  description:
    'Waits up to 25 seconds for something new to happen on a video, then reports its status, the steps recorded so far, any question the recorder is stuck on, and the share link once it is ready. Call it repeatedly until the status is ready or failed, giving the user a one-line update each time.',
  inputSchema: { type: 'object', properties: { video_id: videoIDProperty }, required: ['video_id'] },
  run: async (input, { agentKey, origin }) => {
    const videoID = readString(input, 'video_id');
    const startedAt = Date.now();
    const firstProgress = await fetchQuery(api.agents.readProgress, { agentKey, videoID });
    const firstFingerprint = readFingerprint(firstProgress);
    let progress = firstProgress;
    const isSettled = (status: string) => status === 'ready' || status === 'failed' || status === 'stuck';
    while (!isSettled(progress.video.status) && Date.now() - startedAt < progressWaitMilliseconds) {
      await wait(progressPollMilliseconds);
      progress = await fetchQuery(api.agents.readProgress, { agentKey, videoID });
      if (readFingerprint(progress) !== firstFingerprint) break;
    }
    const place = await fetchQuery(api.queue.readPlace, { videoID });
    return describeProgress(progress, place, origin);
  }
};

const answerQuestion: Tool = {
  name: 'answer_question',
  title: 'Answer the recorder',
  description:
    'Sends the user’s answer to the question the recorder is stuck on, so it can keep going. Only use the user’s own words or a faithful summary of them.',
  inputSchema: {
    type: 'object',
    properties: { video_id: videoIDProperty, answer: { type: 'string', description: 'The hint for the recorder.' } },
    required: ['video_id', 'answer']
  },
  run: async (input, { agentKey }) => {
    await fetchMutation(api.agents.answerQuestion, {
      agentKey,
      videoID: readString(input, 'video_id'),
      hint: readString(input, 'answer')
    });
    return { text: 'Sent. The recorder is back at work. Call get_progress.', data: { status: 'recording' } };
  }
};

const requestLogin: Tool = {
  name: 'request_login',
  title: 'Ask for a test login',
  description:
    'Makes a one-time secure link where the user types a test login for the app. Use it when the recorder is stuck on a sign-in page, when a recording failed because it could not sign in, or when the user says the app needs a login. When the user submits the link, recording restarts from the beginning with the login. Never accept passwords in chat: if the user pastes one, tell them it was not used and give them this link instead.',
  inputSchema: { type: 'object', properties: { video_id: videoIDProperty }, required: ['video_id'] },
  run: async (input, { agentKey, origin }) => {
    const videoID = readString(input, 'video_id');
    const loginToken = await fetchMutation(api.agents.requestLogin, { agentKey, videoID });
    const loginURL = `${origin}/login/${videoID}?token=${loginToken}`;
    return {
      text: `Secure login link: ${loginURL}\n\nGive the user this link. Recording restarts with the login as soon as they submit it. Then call get_progress.`,
      data: { video_id: videoID, login_url: loginURL }
    };
  }
};

const editScriptLine: Tool = {
  name: 'edit_script_line',
  title: 'Change a script line',
  description:
    'Changes the narration of one numbered script line of a finished video. Call rerender_video afterwards to make the change show up in the video. Re-rendering does not record the app again.',
  inputSchema: {
    type: 'object',
    properties: {
      video_id: videoIDProperty,
      line_number: { type: 'integer', minimum: 1, description: 'The line number from the script, starting at 1.' },
      narration: { type: 'string', description: 'The new narration for that line.' }
    },
    required: ['video_id', 'line_number', 'narration']
  },
  run: async (input, { agentKey }) => {
    const lineNumber = Number(input.line_number);
    await fetchMutation(api.agents.editLine, {
      agentKey,
      videoID: readString(input, 'video_id'),
      lineNumber,
      narration: readString(input, 'narration')
    });
    return {
      text: `Line ${lineNumber} updated. Call rerender_video when all edits are done.`,
      data: { line_number: lineNumber }
    };
  }
};

const rerenderVideo: Tool = {
  name: 'rerender_video',
  title: 'Re-render a video',
  description:
    'Rebuilds a finished video with its current script, and optionally a different voice or no voiceover, without recording the app again. Then call get_progress until it is ready.',
  inputSchema: {
    type: 'object',
    properties: {
      video_id: videoIDProperty,
      voiceover: { type: 'boolean', description: 'Turn the voiceover on or off.' },
      voice: { type: 'string', enum: voiceIDs }
    },
    required: ['video_id']
  },
  run: async (input, { agentKey }) => {
    await fetchMutation(api.agents.rerender, {
      agentKey,
      videoID: readString(input, 'video_id'),
      voiceoverEnabled: typeof input.voiceover === 'boolean' ? input.voiceover : undefined,
      voiceID: typeof input.voice === 'string' ? readVoice(input) : undefined
    });
    return { text: 'Re-rendering. Call get_progress.', data: { status: 'rendering' } };
  }
};

const stopVideo: Tool = {
  name: 'stop_video',
  title: 'Stop a video',
  description:
    'Stops a video that is waiting, recording, stuck, or rendering, and frees the recorder. Use it when the user asks to stop or cancel, or when a take has clearly gone wrong.',
  inputSchema: { type: 'object', properties: { video_id: videoIDProperty }, required: ['video_id'] },
  run: async (input, { agentKey }) => {
    await fetchMutation(api.agents.stop, { agentKey, videoID: readString(input, 'video_id') });
    return { text: 'Stopped. The recorder is free for the next video.', data: { status: 'failed' } };
  }
};

const listVideos: Tool = {
  name: 'list_videos',
  title: 'List my videos',
  description: 'Lists the user’s most recent Autoloom videos with their status and links.',
  inputSchema: { type: 'object', properties: {} },
  run: async (_input, { agentKey, origin }) => {
    const videos = await fetchQuery(api.agents.listVideos, { agentKey });
    const rows = videos.map((video) => {
      const { watchURL, shareURL } = readLinks(video.id, origin);
      return {
        video_id: video.id,
        title: video.title,
        status: video.status,
        url: video.status === 'ready' ? shareURL : watchURL
      };
    });
    const text =
      rows.length === 0
        ? 'No videos yet.'
        : rows.map((row) => `- ${row.title} (${row.status}): ${row.url} [video_id ${row.video_id}]`).join('\n');
    return { text, data: { videos: rows } };
  }
};

export const tools: Tool[] = [
  recordVideo,
  getProgress,
  answerQuestion,
  requestLogin,
  editScriptLine,
  rerenderVideo,
  stopVideo,
  listVideos
];

export const serverInstructions =
  'Autoloom records narrated walkthrough videos of web apps. When the user asks for a video of a flow: 1) ask in one message for anything missing (app link, the exact flow, whether it needs a login), 2) call record_video, 3) if it returns a secure login link, give it to the user and never ask for passwords in chat, 4) call get_progress again and again, giving the user one short line about what the recorder just did, 5) if the recorder is stuck, ask the user its question and call answer_question, unless it is stuck on signing in: then call request_login and give the user the secure link, 6) when ready, give the user the share link and offer script edits.';
