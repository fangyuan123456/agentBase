/**
 * agent-runtime/ReActAgent.ts
 * 标准 JSON 协议 ReAct 自治推理智能体实现 (ReAct Agent SSOT)
 *
 * 核心设计：
 * 1. 继承 BaseReActAgent 抽象循环；
 * 2. 默认采用高信噪比的 JSON 规约体系，并集成 JsonSanitizer 自愈模型 markdown 代码块与脏字符；
 * 3. 绝大多数自主工具调用 Agent 直接继承或配置本类即可。
 */
import { BaseReActAgent, } from './BaseReActAgent.js';
import { JsonSanitizer } from '../utils/JsonSanitizer.js';
export class ReActAgent extends BaseReActAgent {
    constructor(config) {
        super(config);
    }
    /**
     * 构造标准 JSON 规约的 ReAct 系统提示词
     */
    buildFullSystemPrompt() {
        const toolsGuide = this.tools.toPromptGuide();
        return `${this.systemPrompt}

你是一个具备自主推理与工具调用能力的专业智能体。
你必须遵循【思考-行动-观察】(ReAct) 循环，直至得出最终结论。

【可用工具清单】：
${toolsGuide}

【输出协议规范】：
在每一轮推理中，你必须且只能输出严格合法的 JSON 对象，格式如下（严禁自然语言开场白）：
{
  "thought": "你的深层思考与因果分析：分析当前已知信息，判断下一步该做什么",
  "action": {
    "toolName": "欲调用的工具名称",
    "parameters": { "参数名": "参数值" }
  },
  "finalAnswer": null
}

如果你已收集到足够的信息或得出了最终方案，请将 action 设为 null，并在 finalAnswer 中输出最终结论：
{
  "thought": "最终总结分析",
  "action": null,
  "finalAnswer": { ...你的最终交付产物... }
}
`;
    }
    /**
     * 基于 JsonSanitizer 容错解析大模型输出
     */
    extractDecision(responseText) {
        const parsed = JsonSanitizer.extractJsonFromText(responseText);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error(`模型输出无法解析为标准 JSON 对象: ${responseText}`);
        }
        return {
            thought: parsed.thought,
            action: parsed.action || null,
            finalAnswer: parsed.finalAnswer ?? null,
        };
    }
}
//# sourceMappingURL=ReActAgent.js.map