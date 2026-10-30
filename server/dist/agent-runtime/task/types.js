/**
 * agent-runtime/task/types.ts
 * 通用动态可变任务拓扑图（DAG TaskGraph）类型定义 (SSOT)
 * 纯通用技术底座，无业务概念依赖
 */
export const TASK_STATUS = {
    PENDING: 'PENDING', // 等待前置依赖完成
    READY: 'READY', // 前置依赖已满足，就绪可执行
    ACTIVE: 'ACTIVE', // 正在执行
    COMPLETED: 'COMPLETED', // 执行完成
    FAILED: 'FAILED', // 失败
    SKIPPED: 'SKIPPED', // 因上游失败或条件不满足而跳过
};
//# sourceMappingURL=types.js.map