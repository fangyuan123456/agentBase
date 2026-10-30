/**
 * agent-runtime/EventStream.ts
 * 事件流核心实现 —— 全系统统一流式事件与事实来源 (SSOT)
 */
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
export class EventStream {
    emitter = new EventEmitter();
    history = [];
    projectId;
    constructor(projectId) {
        this.projectId = projectId;
        this.emitter.setMaxListeners(100);
    }
    /**
     * 发布事件到流中，自动补充 id、timestamp、projectId
     */
    emit(event) {
        const fullEvent = {
            ...event,
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            projectId: this.projectId,
        };
        this.history.push(fullEvent);
        this.emitter.emit(fullEvent.type, fullEvent);
        this.emitter.emit('*', fullEvent);
        return fullEvent;
    }
    /**
     * 订阅特定类型事件
     */
    on(type, handler) {
        this.emitter.on(type, handler);
        return () => this.emitter.off(type, handler);
    }
    /**
     * 单次订阅
     */
    once(type) {
        return new Promise((resolve) => {
            this.emitter.once(type, resolve);
        });
    }
    /**
     * 获取所有事件历史
     */
    getHistory() {
        return this.history;
    }
}
//# sourceMappingURL=EventStream.js.map