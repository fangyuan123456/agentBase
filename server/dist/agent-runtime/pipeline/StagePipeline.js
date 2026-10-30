/**
 * agent-runtime/pipeline/StagePipeline.ts
 * 通用微观 Stage 流水线引擎 (纯数据输入输出)
 *
 * 核心机制：
 * 原生接收与绑定 projectId，自动将其注入每一个添加的 Stage，
 * 消除业务 Stage 间数据透传 projectId 的必要性。
 */
import { Pipeline } from './Pipeline.js';
class StageStepAdapter {
    stage;
    name;
    constructor(stage) {
        this.stage = stage;
        this.name = stage.name;
    }
    async run(input) {
        return this.stage.execute(input);
    }
}
export class StagePipeline extends Pipeline {
    constructor(name = 'StagePipeline', projectId) {
        super(name, projectId);
    }
    addStage(stage) {
        if (this.projectId && typeof stage.setProjectId === 'function') {
            stage.setProjectId(this.projectId);
        }
        this.addStep(new StageStepAdapter(stage));
        return this;
    }
    addParallelStages(stages, options) {
        const steps = stages.map((s) => {
            if (this.projectId && typeof s.setProjectId === 'function') {
                s.setProjectId(this.projectId);
            }
            return new StageStepAdapter(s);
        });
        this.addParallel(steps, options);
        return this;
    }
}
//# sourceMappingURL=StagePipeline.js.map