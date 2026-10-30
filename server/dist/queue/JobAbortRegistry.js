/**
 * queue/JobAbortRegistry.ts
 * 活跃任务中止控制器注册中心 (Job Abort Registry SSOT)
 *
 * 核心法则：
 * 1. 统一维护当前正在执行任务的 AbortController 实例；
 * 2. 接收来自 HTTP API 或客户端的中断信号，毫秒级触发 AbortSignal；
 * 3. 任务正常收敛或异常退出后自动清理释放，无内存泄漏。
 */
export class JobAbortRegistry {
    static controllers = new Map();
    static create(projectId) {
        let controller = this.controllers.get(projectId);
        if (!controller) {
            controller = new AbortController();
            this.controllers.set(projectId, controller);
        }
        return controller;
    }
    static get(projectId) {
        return this.controllers.get(projectId);
    }
    static abort(projectId) {
        const controller = this.controllers.get(projectId);
        if (controller) {
            controller.abort();
            this.controllers.delete(projectId);
            return true;
        }
        return false;
    }
    static remove(projectId) {
        this.controllers.delete(projectId);
    }
}
//# sourceMappingURL=JobAbortRegistry.js.map