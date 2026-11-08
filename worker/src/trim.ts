import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ConvexHttpClient } from 'convex/browser';

import { environment } from '@worker/environment';
import { api } from '../../convex/_generated/api';

import type { Id } from '../../convex/_generated/dataModel';

const [videoID, secondsText] = process.argv.slice(2);
const seconds = Number(secondsText);
if (!videoID || !(seconds > 0)) throw new Error('Usage: npm run trim -- <videoID> <seconds>');

const client = new ConvexHttpClient(environment.convexURL);
const workerSecret = environment.workerSecret;
const require = createRequire(import.meta.url);
const ffmpegDirectory = dirname(require.resolve('@remotion/compositor-linux-x64-gnu/package.json'));

function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      join(ffmpegDirectory, 'ffmpeg'),
      ['-y', '-i', inputPath, '-t', String(seconds), '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', '+faststart', outputPath],
      { env: { ...process.env, LD_LIBRARY_PATH: ffmpegDirectory }, stdio: 'inherit' }
    );
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
}

const fileURL = await client.query(api.worker.readVideoFileURL, { workerSecret, videoID: videoID as Id<'videos'> });
if (!fileURL) throw new Error('This video has no file yet');
const inputPath = join(tmpdir(), `${videoID}-full.mp4`);
const outputPath = join(tmpdir(), `${videoID}-trimmed.mp4`);
await writeFile(inputPath, Buffer.from(await (await fetch(fileURL)).arrayBuffer()));
await runFfmpeg(inputPath, outputPath);

const uploadURL = await client.mutation(api.worker.createUploadURL, { workerSecret });
const response = await fetch(uploadURL, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: await readFile(outputPath) });
if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
await client.mutation(api.worker.replaceVideoFile, { workerSecret, videoID: videoID as Id<'videos'>, videoFileID: storageId, durationSeconds: seconds });
console.log(`Trimmed ${videoID} to ${seconds}s`);
