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
import { ProjectStore } from '../../project-store/ProjectStore.js';
export class ProjectMemoryAdapter {
    innerMemory;
    constructor(innerMemory) {
        this.innerMemory = innerMemory;
        this.hydrateFromStore();
    }
    get projectId() {
        return this.innerMemory.projectId;
    }
    /**
     * 从 ProjectStore 加载已有历史
     */
    hydrateFromStore() {
        const project = ProjectStore.getInstance().getProject(this.projectId);
        if (project?.messages && project.messages.length > 0) {
            const chatMessages = project.messages.map((m) => ({
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
    syncToStore() {
        const store = ProjectStore.getInstance();
        const project = store.getProject(this.projectId);
        if (!project)
            return;
        const sessionMessages = this.innerMemory.getMessages().map((m) => ({
            id: m.id || randomUUID(),
            sender: m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : 'agent',
            content: m.content,
            timestamp: m.timestamp || new Date().toISOString(),
        }));
        project.messages = sessionMessages;
        project.updatedAt = new Date().toISOString();
        store.saveProject(project);
    }
    addMessage(message) {
        this.innerMemory.addMessage(message);
        this.syncToStore();
    }
    addMessages(messages) {
        this.innerMemory.addMessages(messages);
        this.syncToStore();
    }
    getMessages() {
        return this.innerMemory.getMessages();
    }
    toLLMHistory() {
        return this.innerMemory.toLLMHistory();
    }
    getTotalTokens() {
        return this.innerMemory.getTotalTokens();
    }
    clear() {
        this.innerMemory.clear();
        this.syncToStore();
    }
    serialize() {
        return this.innerMemory.serialize();
    }
    load(messages) {
        this.innerMemory.load(messages);
        this.syncToStore();
    }
}
//# sourceMappingURL=ProjectMemoryAdapter.js.map