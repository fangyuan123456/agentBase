/**
 * llm/MockLLMService.ts
 * 离线高保真大模型模拟服务
 */
export class MockLLMService {
    hasVisionCapability() {
        return true;
    }
    async generateTextWithImages(prompt, images, systemPrompt, options) {
        return JSON.stringify({ passed: true, score: 95, issues: [] });
    }
    async generateMultiTurn(systemPrompt, history, options) {
        return JSON.stringify({
            thought: 'Mock execution finished',
            tool: 'finish',
            args: { summary: 'Mock execution completed successfully.' },
        });
    }
    async generateText(prompt, systemPrompt, options) {
        return JSON.stringify({ success: true, message: 'Mock LLM Response' });
    }
    async generateObject(prompt, schema, systemPrompt, options) {
        return {};
    }
}
//# sourceMappingURL=MockLLMService.js.map