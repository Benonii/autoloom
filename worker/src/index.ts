import { api, claimJob, liveClient, sendHeartbeat } from '@worker/convex';
import { environment } from '@worker/environment';
import { runJob } from '@worker/jobs';

let isBusy = false;
let pendingJobID: string | null = null;

async function work(jobID: string): Promise<void> {
  if (isBusy) {
    pendingJobID = jobID;
    return;
  }
  isBusy = true;
  try {
    const job = await claimJob(jobID);
    if (job) await runJob(job);
  } finally {
    isBusy = false;
    const nextJobID = pendingJobID;
    pendingJobID = null;
    if (nextJobID) void work(nextJobID);
  }
}

liveClient.onUpdate(api.worker.nextJob, { workerSecret: environment.workerSecret }, (job) => {
  if (job) void work(job.id);
});

const heartbeatMilliseconds = 15_000;

function beat(): void {
  sendHeartbeat().catch((error) => console.error('Heartbeat failed', error));
}

beat();
setInterval(beat, heartbeatMilliseconds);

console.log(`Autoloom worker listening on ${environment.convexURL}`);
