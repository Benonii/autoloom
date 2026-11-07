function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to worker/.env`);
  return value;
}

export const environment = {
  convexURL: readRequired('CONVEX_URL'),
  workerSecret: readRequired('WORKER_SECRET'),
  openAIKey: process.env.OPENAI_API_KEY ?? '',
  plannerModel: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
  elevenLabsKey: process.env.ELEVENLABS_API_KEY ?? '',
  elevenLabsModel: process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
  speechModel: process.env.OPENAI_SPEECH_MODEL ?? 'gpt-4o-mini-tts',
  outputDirectory: process.env.AUTOLOOM_OUTPUT ?? new URL('../output', import.meta.url).pathname,
  isHeadless: process.env.AUTOLOOM_HEADFUL !== '1'
};
