import { api, claimJob, liveClient, sendHeartbeat } from '@worker/convex';
import { environment } from '@worker/environment';
import { runJob } from '@worker/jobs';

let latestJobID: string | null = null;
let runningCount = 0;
const claimingJobIDs = new Set<string>();
const claimedJobIDs = new Set<string>();

function pump(): void {
  const jobID = latestJobID;
  if (!jobID || runningCount >= environment.workerSlots || claimingJobIDs.has(jobID) || claimedJobIDs.has(jobID))
    return;
  runningCount += 1;
  claimingJobIDs.add(jobID);
  void (async () => {
    try {
      const job = await claimJob(jobID);
      claimedJobIDs.add(jobID);
      claimingJobIDs.delete(jobID);
      if (job) await runJob(job);
    } catch (error) {
      console.error('Could not run the job', error);
    } finally {
      claimingJobIDs.delete(jobID);
      runningCount -= 1;
      pump();
    }
  })();
}

liveClient.onUpdate(api.worker.nextJob, { workerSecret: environment.workerSecret }, (job) => {
  latestJobID = job?.id ?? null;
  pump();
});

const heartbeatMilliseconds = 15_000;

function beat(): void {
  sendHeartbeat().catch((error) => console.error('Heartbeat failed', error));
}

beat();
setInterval(beat, heartbeatMilliseconds);

console.log(
  `Autoloom worker listening on ${environment.convexURL} with ${environment.workerSlots} slot${environment.workerSlots === 1 ? '' : 's'}`
);
