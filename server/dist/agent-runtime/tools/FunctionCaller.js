/**
 * agent-runtime/tools/FunctionCaller.ts
 * 智能体工具调用闭环执行引擎 (Function Caller SSOT)
 *
 * 核心机制：
 * 负责接收大模型的调用请求，调度 ToolRegistry，捕获执行状态并构造标准 Observation 交付。
 */
export class FunctionCaller {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * 执行单个工具调用闭环
     */
    async call(toolCall, context) {
        const result = await this.registry.execute(toolCall, context);
        return {
            toolName: toolCall.toolName,
            parameters: toolCall.parameters,
            result,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * 格式化 Observation 为大模型可读上下文
     */
    formatObservation(obs) {
        if (obs.result.success) {
            return `【工具 ${obs.toolName} 执行成功】：\n${JSON.stringify(obs.result.data, null, 2)}`;
        }
        return `【工具 ${obs.toolName} 执行失败】：\n错误原因: ${obs.result.error || '未知异常'}`;
    }
}
//# sourceMappingURL=FunctionCaller.js.map