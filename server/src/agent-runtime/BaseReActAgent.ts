/**
 * agent-runtime/BaseReActAgent.ts
 * 统一 ReAct 自治推理智能体基类 (ReAct Agent SSOT)
 *
 * 核心机制：
 * 1. 继承 BaseAgent，原生持有 projectId；
 * 2. 具备完整的 ReAct 自治推理循环 (Thought ➔ Action ➔ Observation ➔ Final Answer)；
 * 3. 内置高信噪比的 JSON 规约体系，并集成 JsonSanitizer 自愈模型输出；
 * 4. 内置受控最大迭代轮次 (maxIterations)、Token 预算滑动窗口与 JobAbortRegistry 熔断拦截；
 * 5. 记忆与 ProjectStore 无缝打通，执行过程自动落盘与同步。
 */

import { BaseAgent, type AgentResult } from './BaseAgent.js';
import type { AgentRole } from './contracts/AgentRole.js';
import type { ITool, ToolCall } from './contracts/Tool.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
import { FunctionCaller } from './tools/FunctionCaller.js';
import type { IMemory } from './memory/Memory.js';
import { BufferMemory } from './memory/BufferMemory.js';
import { ProjectMemoryAdapter } from './memory/ProjectMemoryAdapter.js';
import { EventStream } from './EventStream.js';
import { LLMRegistry } from '../llm/LLMRegistry.js';
import { JsonSanitizer } from '../utils/JsonSanitizer.js';
import { JobAbortRegistry } from '../queue/JobAbortRegistry.js';

export interface BaseReActAgentConfig {
  role: AgentRole;
  systemPrompt: string;
  projectId?: string;
  tools?: ITool[];
  maxIterations?: number;
  temperature?: number;
  maxMemoryMessages?: number;
  maxTokenBudget?: number;
  syncWithStore?: boolean;
}

export interface ReActStepDecision {
  thought?: string;
  action?: ToolCall | null;
  finalAnswer?: any | null;
}

export abstract class BaseReActAgent<TInput = any, TOutput = any> extends BaseAgent<TInput, TOutput> {
  protected readonly systemPrompt: string;
  protected readonly tools: ToolRegistry;
  protected readonly caller: FunctionCaller;
  protected readonly maxIterations: number;
  protected readonly temperature: number;
  protected readonly maxMemoryMessages: number;
  protected readonly maxTokenBudget: number;
  protected readonly syncWithStore: boolean;
  protected memory?: IMemory;
  protected eventStream?: EventStream;

  constructor(config: BaseReActAgentConfig) {
    super(config.role, config.projectId);
    this.systemPrompt = config.systemPrompt;
    this.maxIterations = Math.max(1, config.maxIterations || 8);
    this.temperature = config.temperature ?? 0.3;
    this.maxMemoryMessages = config.maxMemoryMessages || 20;
    this.maxTokenBudget = config.maxTokenBudget || 6000;
    this.syncWithStore = config.syncWithStore !== false;

    this.tools = new ToolRegistry(config.tools);
    this.caller = new FunctionCaller(this.tools);

    if (this.projectId) {
      this.initContext(this.projectId);
    }
  }

  public override setProjectId(projectId: string): this {
    super.setProjectId(projectId);
    this.initContext(projectId);
    return this;
  }

  protected initContext(projectId: string): void {
    const rawMemory = new BufferMemory(projectId, {
      maxMessages: this.maxMemoryMessages,
      maxTokenBudget: this.maxTokenBudget,
      preserveSystem: true,
    });

    this.memory = this.syncWithStore ? new ProjectMemoryAdapter(rawMemory) : rawMemory;
    this.eventStream = new EventStream(projectId);
  }

  /**
   * 注册单个新工具
   */
  public addTool(tool: ITool): this {
    this.tools.register(tool);
    return this;
  }

  /**
   * 业务输入转化为初始 User 提示词 (子类必须实现)
   */
  protected abstract buildUserPrompt(input: TInput): string;

  /**
   * 构造完整的 ReAct 决策系统提示词 (默认提供标准 JSON 规约，子类可覆盖定制)
   */
  protected buildFullSystemPrompt(): string {
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
   * 从大模型原始文本输出中解析结构化决策 (默认使用 JsonSanitizer 自愈解析，子类可覆盖)
   */
  protected extractDecision(responseText: string): ReActStepDecision {
    const parsed = JsonSanitizer.extractJsonFromText<any>(responseText);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`[${this.role}] 模型输出无法解析为标准 JSON 决策: ${responseText}`);
    }

    return {
      thought: parsed.thought,
      action: parsed.action || null,
      finalAnswer: parsed.finalAnswer ?? null,
    };
  }

  /**
   * 将最终决策产物格式化为强类型交付物 (子类可重写)
   */
  protected parseFinalAnswer(finalAnswer: any): TOutput {
    return finalAnswer as TOutput;
  }

  /**
   * ReAct 自治推理执行主循环 (SSOT)
   */
  public async run(input: TInput): Promise<AgentResult<TOutput>> {
    const startMs = Date.now();
    const activeProjectId = (input as any)?.projectId || this.projectId;

    if (activeProjectId && !this.memory) {
      this.initContext(activeProjectId);
    }

    if (!activeProjectId) {
      throw new Error(`[${this.role}] 必须指定 projectId 方可执行`);
    }

    const abortSignal = (input as any)?.abortSignal;
    const llm = LLMRegistry.get();
    const systemPrompt = this.buildFullSystemPrompt();
    const initialPrompt = this.buildUserPrompt(input);

    this.memory!.clear();
    this.memory!.addMessage({ role: 'user', content: initialPrompt });

    let iteration = 0;
    let finalAnswerData: any = null;

    while (iteration < this.maxIterations) {
      // 1. 中断嗅探
      if (
        abortSignal?.aborted ||
        (activeProjectId && JobAbortRegistry.get(activeProjectId)?.signal.aborted)
      ) {
        throw new Error(`[${this.role}] 执行已被中断信号主动取消`);
      }

      iteration++;

      // 2. 组装多轮上下文并向 LLM 请求下一步决策
      const history = this.memory!.toLLMHistory();
      const currentPrompt =
        history.length > 0 ? history[history.length - 1].content : initialPrompt;

      const responseText = await llm.generateText(currentPrompt, systemPrompt, {
        temperature: this.temperature,
        abortSignal,
      });

      // 3. 提取结构化决策
      const decision = this.extractDecision(responseText);
      const { thought, action, finalAnswer } = decision;

      // 4. 发射 THOUGHT 事件 (供前端可视化)
      if (thought) {
        this.eventStream?.emit({
          type: 'THOUGHT',
          agentId: this.agentId,
          agentRole: this.role,
          content: thought,
        });
      }

      // 5. 判定是否收敛得到 Final Answer
      if (finalAnswer !== null && finalAnswer !== undefined && !action) {
        finalAnswerData = finalAnswer;
        break;
      }

      // 6. 执行工具调用 (Action ➔ Observation)
      if (action && action.toolName) {
        this.eventStream?.emit({
          type: 'ACTION',
          agentId: this.agentId,
          agentRole: this.role,
          action,
        });

        const observation = await this.caller.call(action, {
          projectId: activeProjectId,
          abortSignal,
        });

        this.eventStream?.emit({
          type: 'OBSERVATION',
          agentId: this.agentId,
          agentRole: this.role,
          result: observation.result,
        });

        // 将 Observation 作为环境反馈回填至 Memory
        const observationText = this.caller.formatObservation(observation);
        this.memory!.addMessage({
          role: 'user',
          content: `【工具调用反馈】\n${observationText}\n请根据此结果继续推理，输出下一步行动或给出最终结论。`,
        });
      } else {
        // 既无 action 也无 finalAnswer 的空转保护
        if (thought) {
          finalAnswerData = thought;
          break;
        }
        throw new Error(`[${this.role}] 模型陷入无行动且无结论的空转状态`);
      }
    }

    if (!finalAnswerData && iteration >= this.maxIterations) {
      throw new Error(
        `[${this.role}] 超过最大自主迭代轮次 (${this.maxIterations})，已主动阻断以防 Token 浪费`,
      );
    }

    const structuredData = this.parseFinalAnswer(finalAnswerData);
    return this.finishResult(
      true,
      `Agent [${this.role}] 自治推理完成 (共迭代 ${iteration} 轮)`,
      structuredData,
      startMs,
    );
  }
}
