/**
 * agent-runtime/BaseAgent.ts
 * 统一轻量通用 Agent 抽象基类 (Uniform Agent Lifecycle SSOT)
 *
 * 核心机制：
 * 1. Base 原生持有 projectId，消除跨 Stage / Pipeline 的层层传递与污染；
 * 2. 具备通用切面执行包裹 execute()，自动度量耗时与捕获异常；
 * 3. 开放支持任意通用 AgentRole 角色注册与派发。
 */
import { randomUUID } from 'crypto';
export class BaseAgent {
    agentId;
    role;
    /** 🌟 核心工程唯一标识：Base 原生持有，免去参数层层传递 */
    projectId;
    constructor(role, projectId) {
        this.role = role;
        this.projectId = projectId;
        this.agentId = `${String(this.role).toLowerCase()}-${randomUUID().slice(0, 8)}`;
    }
    /**
     * 设定或切换当前工程 ID
     */
    setProjectId(projectId) {
        this.projectId = projectId;
        return this;
    }
    getProjectId() {
        return this.projectId;
    }
    /**
     * 统一受控切面执行入口（包含耗时度量与生命周期钩子）
     */
    async execute(input) {
        const startMs = Date.now();
        try {
            if (typeof this.onBeforeRun === 'function') {
                await this.onBeforeRun(input);
            }
            const result = await this.run(input);
            if (typeof this.onAfterRun === 'function') {
                await this.onAfterRun(result);
            }
            if (result.durationMs === undefined) {
                result.durationMs = Date.now() - startMs;
            }
            return result;
        }
        catch (err) {
            if (typeof this.onError === 'function') {
                await this.onError(err, input);
            }
            return {
                success: false,
                data: undefined,
                summary: `Agent [${this.role}] 执行异常: ${err.message || String(err)}`,
                durationMs: Date.now() - startMs,
                error: err.message || String(err),
            };
        }
    }
    /**
     * 构造标准化交付物
     */
    finishResult(success, summary, data, startMs) {
        return {
            success,
            data,
            summary,
            durationMs: startMs ? Date.now() - startMs : undefined,
        };
    }
}
//# sourceMappingURL=BaseAgent.js.map