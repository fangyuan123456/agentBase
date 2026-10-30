/**
 * agent-runtime/contracts/AgentRole.ts
 * 通用智能体角色与工种身份契约 (Agent Role SSOT)
 * 纯通用微内核设计，开放支持任意领域角色的注册与调度
 */

export type AgentRole = string;

export interface AgentDescriptor {
  readonly role: AgentRole;
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
}
