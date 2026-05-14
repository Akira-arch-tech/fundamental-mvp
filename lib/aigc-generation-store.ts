/** 兼容旧 import；实现见 `aigc-job-service.ts` */
export {
  AIGC_CONFIRM_WINDOW_MS,
  confirmAigcGeneration,
  confirmGenerationJob,
  createGenerationJob,
  enqueueAigcGeneration,
  getAigcJob,
  getGenerationJob,
  runAigcWorkerBatch,
  __clearAigcJobsForTests,
} from "./aigc-job-service";
export type { EnqueueAigcParams } from "./aigc-job-service";
