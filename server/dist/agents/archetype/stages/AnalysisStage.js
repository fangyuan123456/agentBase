/**
 * agents/archetype/stages/AnalysisStage.ts
 * 阶段 01: 意图分析与概念抽取 (纯数据进 ➔ 纯数据出)
 */
import { AgentStage } from '../../../agent-runtime/index.js';
export class AnalysisStage extends AgentStage {
    name = 'AnalysisStage';
    stageIndex = '01_analysis';
    constructor(projectId) {
        super('NARRATIVE_DESIGNER', projectId);
    }
    async run(input) {
        const prompt = input.userFeedback
            ? `${input.userPrompt} (用户修改指示: ${input.userFeedback})`
            : input.userPrompt || '';
        const keywords = prompt.split(/[\s,，、]+/).filter((w) => w.length > 1);
        return {
            theme: input.style || '默认影视质感',
            keywords,
            intent: prompt,
        };
    }
}
//# sourceMappingURL=AnalysisStage.js.map