/**
 * agent-runtime/tools/ToolRegistry.ts
 * 现代强类型工具注册表与运行时管理器 (Tool Registry SSOT)
 *
 * 核心特性：
 * 1. 严格基于 Zod Schema 进行参数安全校验与清洗，抵御模型幻觉参数；
 * 2. 自动格式化工具清单为 LLM 提示词指南；
 * 3. 统计工具调用耗时与统一异常熔断处理。
 */

import type { ITool, ToolCall, ToolContext, ToolResult } from '../contracts/Tool.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ITool>();

  constructor(initialTools?: ITool[]) {
    if (initialTools) {
      this.registerAll(initialTools);
    }
  }

  /**
   * 注册单个工具 (同名覆盖并告警)
   */
  public register(tool: ITool): this {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] 工具 "${tool.name}" 已存在，执行覆盖注册`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * 批量注册工具
   */
  public registerAll(tools: ITool[]): this {
    for (const tool of tools) {
      this.register(tool);
    }
    return this;
  }

  /**
   * 获取指定工具
   */
  public get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * 检查是否已包含指定工具
   */
  public has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取所有注册工具列表
   */
  public getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 生成给大模型阅读的工具描述清单 (Prompt System Guide)
   */
  public toPromptGuide(): string {
    const list = this.getAll();
    if (list.length === 0) return '当前无可用外部工具。';

    return list
      .map((tool, index) => {
        let paramDesc = '';
        try {
          if (typeof (tool.schema as any)?.description === 'string') {
            paramDesc = (tool.schema as any).description;
          } else {
            paramDesc = JSON.stringify((tool.schema as any)?._def?.shape?.() || {}, null, 2);
          }
        } catch {
          paramDesc = '符合 Zod Schema 规则的对象';
        }
        return `${index + 1}. 工具名称: \`${tool.name}\`\n   功能描述: ${tool.description}\n   参数规约: ${paramDesc}`;
      })
      .join('\n\n');
  }

  /**
   * 执行工具调用 (含 Zod 校验、耗时度量与上下文透传)
   */
  public async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(call.toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: "${call.toolName}"`,
      };
    }

    const startMs = Date.now();

    // 1. Zod 严格参数解析校验
    let validatedParams: any;
    try {
      if (typeof tool.schema?.parse === 'function') {
        validatedParams = tool.schema.parse(call.parameters);
      } else {
        validatedParams = call.parameters;
      }
    } catch (parseErr: any) {
      return {
        success: false,
        error: `参数格式校验失败: ${parseErr.message || String(parseErr)}`,
        durationMs: Date.now() - startMs,
      };
    }

    // 2. 执行工具
    try {
      const result = await tool.execute(validatedParams, context);
      return {
        ...result,
        durationMs: Date.now() - startMs,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || String(err),
        durationMs: Date.now() - startMs,
      };
    }
  }
}
