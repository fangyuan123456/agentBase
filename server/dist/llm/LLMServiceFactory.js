/**
 * llm/LLMServiceFactory.ts
 * LLM 服务工厂统一门面
 */
import { RealLLMService } from './RealLLMService.js';
import { MockLLMService } from './MockLLMService.js';
export class LLMServiceFactory {
    static create(customModelId) {
        if (process.env.USE_MOCK_LLM === 'true') {
            return new MockLLMService();
        }
        return new RealLLMService(customModelId);
    }
    static createMock() {
        return new MockLLMService();
    }
}
//# sourceMappingURL=LLMServiceFactory.js.map