/**
 * llm/LLMRegistry.ts
 * 全局大模型服务单例注册中心 (LLM Registry SSOT)
 */
import { LLMServiceFactory } from './LLMServiceFactory.js';
export class LLMRegistry {
    static instance;
    static get() {
        if (!LLMRegistry.instance) {
            LLMRegistry.instance = LLMServiceFactory.create();
        }
        return LLMRegistry.instance;
    }
    static getInstance() {
        return this.get();
    }
    static set(service) {
        LLMRegistry.instance = service;
    }
    static register(service) {
        LLMRegistry.instance = service;
    }
}
//# sourceMappingURL=LLMRegistry.js.map