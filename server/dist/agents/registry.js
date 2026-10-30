/**
 * agents/registry.ts
 * 业务 Agent 向 AgentDispatcher 的统一注册工厂 (SSOT)
 */
import { ArchetypeAgent } from './archetype/index.js';
export function registerDefaultAgents(dispatcher) {
    dispatcher.register('NARRATIVE_DESIGNER', () => new ArchetypeAgent());
    return dispatcher;
}
//# sourceMappingURL=registry.js.map