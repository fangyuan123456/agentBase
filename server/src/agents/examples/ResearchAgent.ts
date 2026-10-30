/**
 * agents/examples/ResearchAgent.ts
 * 通用 ReAct 智能体标准开发示例 (Example SSOT)
 *
 * 展示如何直接继承 BaseReActAgent 并以极简代码定义带有强类型工具的自治 Agent。
 */

import { z } from 'zod';
import { BaseReActAgent, createTool, type AgentResult } from '../../agent-runtime/index.js';

// 1. 使用 Zod 强类型定义业务工具
export const searchKnowledgeTool = createTool({
  name: 'search_knowledge',
  description: '查询专业知识库或文档信息',
  schema: z.object({
    query: z.string().describe('检索关键词或查询句'),
    topK: z.number().optional().default(3).describe('期望返回条目数量'),
  }),
  execute: async ({ query, topK }) => {
    return {
      success: true,
      data: [
        `[文档 1] 关于 "${query}" 的架构规范：采用声明式微内核设计。`,
        `[文档 2] 关于 "${query}" 的数据流：以 projectId 作为唯一事实来源 (SSOT)。`,
      ].slice(0, topK),
    };
  },
});

export const computeMetricTool = createTool({
  name: 'compute_metric',
  description: '执行指标加权计算',
  schema: z.object({
    scores: z.array(z.number()).describe('评分数值数组'),
  }),
  execute: async ({ scores }) => {
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    return {
      success: true,
      data: { average: Number(avg.toFixed(2)), totalSamples: scores.length },
    };
  },
});

export interface ResearchInput {
  topic: string;
  projectId: string;
}

export interface ResearchReport {
  title: string;
  findings: string[];
  recommendation: string;
}

// 2. 直接继承 BaseReActAgent，开箱即用默认 JSON 规约体系
export class ResearchAgent extends BaseReActAgent<ResearchInput, ResearchReport> {
  constructor(projectId?: string) {
    super({
      role: 'RESEARCH_SPECIALIST',
      systemPrompt: '你是一位资深研究与架构分析专家，善于查阅知识库并给出精确方案。',
      projectId,
      tools: [searchKnowledgeTool, computeMetricTool],
      maxIterations: 5,
    });
  }

  protected buildUserPrompt(input: ResearchInput): string {
    return `请针对课题 "${input.topic}" 展开调研，利用工具检索相关知识库，并输出结构化研究报告。`;
  }

  protected override parseFinalAnswer(finalAnswer: any): ResearchReport {
    return {
      title: finalAnswer?.title || '未命名报告',
      findings: Array.isArray(finalAnswer?.findings) ? finalAnswer.findings : [String(finalAnswer)],
      recommendation: finalAnswer?.recommendation || '暂无进一步建议',
    };
  }
}
