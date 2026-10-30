/**
 * agent-runtime/AgentStage.ts
 * 统一 Stage 抽象基类 (纯数据输入输出 / 无状态切面度量 SSOT)
 *
 * 核心机制：
 * Stage 基类原生持有 projectId，无缝直接读写 ProjectStore，
 * 彻底消除业务入参和返回值中层层回传 projectId 的数据污染。
 */
export class AgentStage {
    agentRole;
    /** 🌟 核心工程唯一标识：Stage 基类原生持有 */
    projectId;
    constructor(agentRole, projectId) {
        this.agentRole = agentRole;
        this.projectId = projectId;
    }
    setProjectId(projectId) {
        this.projectId = projectId;
        return this;
    }
    getProjectId() {
        return this.projectId;
    }
    /**
     * 执行切面包裹：记录耗时并返回产物
     */
    async execute(input) {
        return this.run(input);
    }
}
//# sourceMappingURL=AgentStage.js.map