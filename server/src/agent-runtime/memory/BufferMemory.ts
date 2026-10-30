/**
 * agent-runtime/memory/BufferMemory.ts
 * 基于滑动窗口与 Token 预算的短期缓冲记忆实现 (Buffer Memory SSOT)
 *
 * 核心机制：
 * 1. 原生绑定 projectId；
 * 2. 双轨防线截断：支持最大条数限制 (maxMessages) 与最大 Token 预算 (maxTokenBudget)；
 * 3. 绝对锁定首条 System 提示词规则，对非系统消息执行自适应 FIFO 滑动截断；
 * 4. 彻底杜绝长上下文、巨型搜索或文件检索导致的 context_window_exceeded 崩溃。
 */

import type { ChatMessage, IMemory } from './Memory.js';
import { Tokenizer } from './Tokenizer.js';

export interface BufferMemoryOptions {
  maxMessages?: number;
  maxTokenBudget?: number;
  preserveSystem?: boolean;
}

export class BufferMemory implements IMemory {
  private messages: ChatMessage[] = [];
  public readonly projectId: string;
  private readonly maxMessages: number;
  private readonly maxTokenBudget: number;
  private readonly preserveSystem: boolean;

  constructor(projectId: string, options?: BufferMemoryOptions) {
    this.projectId = projectId;
    this.maxMessages = Math.max(2, options?.maxMessages || 20);
    this.maxTokenBudget = Math.max(500, options?.maxTokenBudget || 6000);
    this.preserveSystem = options?.preserveSystem !== false;
  }

  public addMessage(message: ChatMessage): void {
    const enriched: ChatMessage = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };
    this.messages.push(enriched);
    this.prune();
  }

  public addMessages(messages: ChatMessage[]): void {
    for (const msg of messages) {
      this.messages.push({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString(),
      });
    }
    this.prune();
  }

  public getMessages(): readonly ChatMessage[] {
    return this.messages;
  }

  public toLLMHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  public getTotalTokens(): number {
    return Tokenizer.estimateMessagesTokens(this.messages);
  }

  public clear(): void {
    this.messages = [];
  }

  public serialize(): ChatMessage[] {
    return [...this.messages];
  }

  public load(messages: ChatMessage[]): void {
    this.messages = [...messages];
    this.prune();
  }

  /**
   * 自适应双轨修剪策略：先按条数截断，再按 Token 预算修剪
   */
  private prune(): void {
    if (this.messages.length === 0) return;

    // 1. 条数截断
    if (this.messages.length > this.maxMessages) {
      this.trimByCount();
    }

    // 2. Token 预算截断
    let currentTokens = this.getTotalTokens();
    while (currentTokens > this.maxTokenBudget && this.messages.length > 1) {
      const removed = this.removeOldestNonSystem();
      if (!removed) break; // 已只剩系统消息，无法再削减
      currentTokens = this.getTotalTokens();
    }
  }

  private trimByCount(): void {
    const systemIndex = this.messages.findIndex((m) => m.role === 'system');
    const hasSystem = this.preserveSystem && systemIndex !== -1;

    if (!hasSystem) {
      this.messages = this.messages.slice(-this.maxMessages);
      return;
    }

    const systemMsg = this.messages[systemIndex];
    const nonSystem = this.messages.filter((_, idx) => idx !== systemIndex);
    const keptNonSystem = nonSystem.slice(-(this.maxMessages - 1));
    this.messages = [systemMsg, ...keptNonSystem];
  }

  private removeOldestNonSystem(): boolean {
    const targetIndex = this.preserveSystem
      ? this.messages.findIndex((m) => m.role !== 'system')
      : 0;

    if (targetIndex === -1) return false;

    this.messages.splice(targetIndex, 1);
    return true;
  }
}
