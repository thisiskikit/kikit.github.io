import type { OpsJob } from "@shared/schema";
import { storage } from "./storage";

const queuedTimers = new Map<string, NodeJS.Timeout>();
const QUEUE_DELAY_MS = 500;
const PROCESS_DELAY_MS = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runJob(jobId: string) {
  const job = await storage.getJob(jobId);
  if (!job || job.status !== "queued") return;

  await storage.updateJob(jobId, {
    status: "running",
    startedAt: new Date(),
  });

  try {
    await wait(PROCESS_DELAY_MS);
    const payload = (job.payloadJson || {}) as Record<string, any>;

    if (job.type === "IMAGE_CUTOUT" || job.type === "IMAGE_TRANSLATE") {
      const kind = job.type === "IMAGE_CUTOUT" ? "cutout" : "translate";
      let image = payload.imageId ? await storage.getAssetImage(String(payload.imageId)) : undefined;

      if (!image && payload.imageUrl) {
        image = await storage.createAssetImage({
          sourceType: "remote",
          sourceUrl: String(payload.imageUrl),
          storedUrl: String(payload.imageUrl),
          metaJson: { importedBy: "job", mode: "dummy" },
        });
      }

      if (!image) {
        throw new Error("Image not found for job.");
      }

      const derivative = await storage.createAssetDerivative({
        imageId: image.id,
        kind,
        paramsJson: {
          mode: "dummy",
          targetLang: payload.targetLang || "ko",
        },
        outputUrl: image.storedUrl || image.sourceUrl || null,
      });

      await storage.updateJob(jobId, {
        status: "succeeded",
        finishedAt: new Date(),
        resultJson: {
          kind,
          imageId: image.id,
          derivativeId: derivative.id,
          outputUrl: derivative.outputUrl,
        },
      });
      return;
    }

    await storage.updateJob(jobId, {
      status: "succeeded",
      finishedAt: new Date(),
      resultJson: { message: "Dummy job completed." },
    });
  } catch (err: any) {
    await storage.updateJob(jobId, {
      status: "failed",
      finishedAt: new Date(),
      errorText: err?.message || "Job failed.",
    });
  }
}

export function scheduleJob(job: OpsJob) {
  if (queuedTimers.has(job.id)) return;
  const timer = setTimeout(async () => {
    queuedTimers.delete(job.id);
    await runJob(job.id);
  }, QUEUE_DELAY_MS);
  queuedTimers.set(job.id, timer);
}

export async function resumeQueuedJobs() {
  const queued = await storage.getJobs({ status: "queued", limit: 50, offset: 0 });
  queued.forEach(scheduleJob);
}
