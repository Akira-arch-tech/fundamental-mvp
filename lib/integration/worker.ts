import { recordIntegrationAlert } from "@/lib/integration/alerts-store";
import { executeCrmExceptionJob } from "@/lib/integration/adapters/crm";
import { executeErpOutbound } from "@/lib/integration/adapters/erp";
import {
  markJobFailed,
  markJobProcessing,
  markJobSuccess,
  pickDueJobs,
} from "@/lib/integration/jobs-store";

/**
 * 处理对接队列（同步执行，供 `after()` 或显式 worker 调用）。
 */
export async function runIntegrationWorker(limit: number): Promise<{
  processed: number;
  errors: string[];
}> {
  const jobs = await pickDueJobs(limit);
  const errors: string[] = [];
  let processed = 0;

  for (const job of jobs) {
    try {
      await markJobProcessing(job.id);
      if (job.target_system === "erp") {
        if (job.event_type === "erp.order_created" || job.event_type === "erp.exception_instruction") {
          await executeErpOutbound(job.payload, job.request_id);
        } else {
          throw new Error(`unknown ERP event_type: ${job.event_type}`);
        }
      } else if (job.target_system === "crm") {
        if (job.event_type === "crm.exception_updated") {
          await executeCrmExceptionJob(job.payload, job.request_id);
        } else {
          throw new Error(`unknown CRM event_type: ${job.event_type}`);
        }
      } else {
        throw new Error(`unknown target_system: ${job.target_system}`);
      }
      await markJobSuccess(job.id);
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markJobFailed(job.id, msg);
      errors.push(`${job.id}: ${msg}`);
    }
  }

  if (errors.length >= 2) {
    await recordIntegrationAlert({
      level: "warn",
      code: "INTEGRATION_BATCH_WARN",
      message: `本轮 worker 失败 ${errors.length} 条，请检查对接或重试 dead letter`,
      requestId: null,
      meta: { sample: errors.slice(0, 3) },
    });
  }

  return { processed, errors };
}
