/**
 * agent-runtime/contracts/Tool.ts
 * 现代强类型工具契约与规范定义 (Tool Contract SSOT)
 *
 * 核心机制：
 * 1. 采用 Zod 强类型 Schema 定义工具参数，支持自动运行时校验与类型推导；
 * 2. 原生支持依赖注入 context (包括 projectId, abortSignal)；
 * 3. 统一规范工具调用返回值，为 ReAct 自治推理循环提供标准输入输出。
 */
/**
 * 辅助函数：以 100% 强类型推导快速定义工具 (Zero Boilerplate)
 */
export function createTool(tool) {
    return tool;
}
//# sourceMappingURL=Tool.js.map