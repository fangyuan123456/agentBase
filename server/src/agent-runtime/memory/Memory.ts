/**
 * agent-runtime/memory/Memory.ts
 * 智能体记忆系统顶层契约 (Memory SSOT)
 */

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface IMemory {
  /**
   * 关联的工程唯一标识 (SSOT)
   */
  readonly projectId: string;

  /**
   * 追加消息
   */
  addMessage(message: ChatMessage): void;

  /**
   * 批量追加消息
   */
  addMessages(messages: ChatMessage[]): void;

  /**
   * 获取所有历史消息
   */
  getMessages(): readonly ChatMessage[];

  /**
   * 导出为大模型多轮历史格式 (role: 'user' | 'assistant')
   */
  toLLMHistory(): Array<{ role: 'user' | 'assistant'; content: string }>;

  /**
   * 估算当前记忆占用的总 Token 数量
   */
  getTotalTokens(): number;

  /**
   * 清空记忆
   */
  clear(): void;

  /**
   * 序列化快照
   */
  serialize(): ChatMessage[];

  /**
   * 从快照载入
   */
  load(messages: ChatMessage[]): void;
}
