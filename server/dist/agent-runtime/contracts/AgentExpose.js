/**
 * agent-runtime/contracts/AgentExpose.ts
 * 全系统智能体对外统一暴露门面契约 (Agent Expose SSOT)
 *
 * 核心设计：
 * 1. 结构统一：所有 Agent 领域 (Asset, Planner, Coder, Critic 等) 统一具备 expose.ts；
 * 2. 支持为空：若某个 Agent 暂无对外说明，其 getGuide 允许为空字符串或 undefined；
 * 3. 供需明确：面向跨 Agent 协同场景 (如 Asset 必须向 Coder 暴露 Mesh 资源格式与挂载用法)。
 */
export {};
//# sourceMappingURL=AgentExpose.js.map