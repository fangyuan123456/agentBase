/**
 * agent-runtime/memory/ProjectMemoryAdapter.ts
 * 智能体记忆与 ProjectStore 状态黑板双向同步适配器 (SSOT)
 *
 * 核心机制：
 * 1. 包装 IMemory，当有新消息加入时，自动将状态持久化到 ProjectStore.messages；
 * 2. 保证服务重启或 Agent 多阶段执行时，上下文不丢失；
 * 3. 前端可直接通过 /api/project/:projectId/status 实时读取 Agent 对话推进流。
 */

import { randomUUID } from 'crypto';
import type { ChatMessage, IMemory } from './Memory.js';
import { ProjectStore } from '../../project-store/ProjectStore.js';
import type { SessionChatMessage } from '../../contracts/index.js';

export class ProjectMemoryAdapter implements IMemory {
  constructor(private readonly innerMemory: IMemory) {
    this.hydrateFromStore();
  }

  public get projectId(): string {
    return this.innerMemory.projectId;
  }

  /**
   * 从 ProjectStore 加载已有历史
   */
  private hydrateFromStore(): void {
    const project = ProjectStore.getInstance().getProject(this.projectId);
    if (project?.messages && project.messages.length > 0) {
      const chatMessages: ChatMessage[] = project.messages.map((m) => ({
        id: m.id,
        role: m.sender === 'user' ? 'user' : m.sender === 'agent' ? 'assistant' : 'system',
        content: m.content,
        timestamp: m.timestamp,
      }));
      this.innerMemory.load(chatMessages);
    }
  }

  /**
   * 同步写回 ProjectStore
   */
  private syncToStore(): void {
    const store = ProjectStore.getInstance();
    const project = store.getProject(this.projectId);
    if (!project) return;

    const sessionMessages: SessionChatMessage[] = this.innerMemory.getMessages().map((m) => ({
      id: m.id || randomUUID(),
      sender: m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : 'agent',
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
    }));

    project.messages = sessionMessages;
    project.updatedAt = new Date().toISOString();
    store.saveProject(project);
  }

  public addMessage(message: ChatMessage): void {
    this.innerMemory.addMessage(message);
    this.syncToStore();
  }

  public addMessages(messages: ChatMessage[]): void {
    this.innerMemory.addMessages(messages);
    this.syncToStore();
  }

  public getMessages(): readonly ChatMessage[] {
    return this.innerMemory.getMessages();
  }

  public toLLMHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.innerMemory.toLLMHistory();
  }

  public getTotalTokens(): number {
    return this.innerMemory.getTotalTokens();
  }

  public clear(): void {
    this.innerMemory.clear();
    this.syncToStore();
  }

  public serialize(): ChatMessage[] {
    return this.innerMemory.serialize();
  }

  public load(messages: ChatMessage[]): void {
    this.innerMemory.load(messages);
    this.syncToStore();
  }
}
