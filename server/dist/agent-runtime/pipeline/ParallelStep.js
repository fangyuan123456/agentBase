/**
 * agent-runtime/pipeline/ParallelStep.ts
 * 并发步骤容器，支持多个 Step 受控并行执行 (asyncPool / Promise.all)
 * 实时响应中断信号
 */
import { asyncPool } from '../../utils/concurrency.js';
import { JobAbortRegistry } from '../../queue/JobAbortRegistry.js';
export class ParallelStep {
    steps;
    name;
    concurrency;
    onStepComplete;
    constructor(steps, options) {
        this.steps = steps;
        if (typeof options === 'string') {
            this.name = options;
        }
        else {
            this.name = options?.name || `Parallel[${steps.map((s) => s.name).join(' || ')}]`;
            this.concurrency = options?.concurrency;
            this.onStepComplete = options?.onStepComplete;
        }
    }
    async run(input) {
        const total = this.steps.length;
        if (total === 0)
            return [];
        const projectId = input?.projectId;
        const checkAborted = () => {
            if (projectId && JobAbortRegistry.get(projectId)?.signal.aborted) {
                throw new Error(`[ParallelStep] 并行组 [${this.name}] 检测到工程中断信号，已终止执行`);
            }
        };
        checkAborted();
        if (this.concurrency && this.concurrency > 0) {
            return asyncPool(this.concurrency, this.steps, async (step) => {
                checkAborted();
                return step.run(input);
            }, (completed, _total, result) => {
                if (this.onStepComplete) {
                    const stepName = this.steps[completed - 1]?.name || 'UnknownStep';
                    this.onStepComplete(completed, total, stepName, result);
                }
            });
        }
        return Promise.all(this.steps.map(async (step) => {
            checkAborted();
            return step.run(input);
        }));
    }
}
//# sourceMappingURL=ParallelStep.js.map