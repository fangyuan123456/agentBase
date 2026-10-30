/**
 * agent-runtime/message/MessageCenter.ts
 * 统一多 Agent 消息中心实现 (Message Center SSOT)
 *
 * 核心机制：
 * 1. 负责基于 (to + projectId) 的精准请求-响应路由 (Request-Response)
 * 2. 负责基于事件主题的发布-订阅广播 (Pub-Sub)
 * 3. 彻底解耦调用方与被调用方的物理依赖
 */
import { randomUUID } from 'crypto';
export class MessageCenter {
    static instance;
    handlers = new Map();
    subscriptions = new Map();
    static getInstance() {
        if (!MessageCenter.instance) {
            MessageCenter.instance = new MessageCenter();
        }
        return MessageCenter.instance;
    }
    registerHandler(agentName, handler) {
        this.handlers.set(agentName, handler);
    }
    unregisterHandler(agentName) {
        this.handlers.delete(agentName);
    }
    async request(params) {
        const handler = this.handlers.get(params.to);
        if (!handler) {
            return {
                success: false,
                error: `No handler registered for recipient: ${params.to}`,
            };
        }
        const message = {
            ...params,
            id: params.id || randomUUID(),
            timestamp: new Date().toISOString(),
        };
        const start = Date.now();
        try {
            const response = await handler(message);
            return {
                ...response,
                durationMs: Date.now() - start,
            };
        }
        catch (err) {
            return {
                success: false,
                error: err.message || String(err),
                durationMs: Date.now() - start,
            };
        }
    }
    publish(event, payload, projectId) {
        const listeners = this.subscriptions.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(payload, projectId);
                }
                catch (e) {
                    console.error(`[MessageCenter] Error in event listener for "${event}":`, e);
                }
            }
        }
    }
    subscribe(event, callback) {
        let listeners = this.subscriptions.get(event);
        if (!listeners) {
            listeners = new Set();
            this.subscriptions.set(event, listeners);
        }
        listeners.add(callback);
        return () => {
            listeners?.delete(callback);
        };
    }
}
//# sourceMappingURL=MessageCenter.js.map