/**
 * agent-runtime/task/TaskGraph.ts
 * 通用动态可变任务拓扑图（DAG TaskGraph）微内核实现 (SSOT)
 * 纯通用多智能体依赖调度引擎，0 业务依赖
 */
import { randomUUID } from 'crypto';
import { TASK_STATUS, } from './types.js';
export class CyclicDependencyError extends Error {
    constructor(cycle) {
        super(`检测到循环依赖，禁止执行：${cycle.join(' → ')}`);
        this.name = 'CyclicDependencyError';
    }
}
export class TaskGraph {
    nodes = new Map();
    nameToId = new Map();
    idToName = new Map();
    projectId;
    constructor(projectId) {
        this.projectId = projectId;
    }
    addNode(node, label) {
        this.nodes.set(node.id, node);
        if (label) {
            this.nameToId.set(label, node.id);
            this.idToName.set(node.id, label);
        }
    }
    importSnapshot(snapshot) {
        if (!snapshot?.nodes)
            return;
        for (const node of snapshot.nodes) {
            this.nodes.set(node.id, { ...node });
            const label = node.payload?.name || node.id;
            this.nameToId.set(label, node.id);
            this.idToName.set(node.id, label);
        }
    }
    getIdByName(name) {
        return this.nameToId.get(name);
    }
    getTaskById(taskId) {
        return this.nodes.get(taskId);
    }
    registerName(name, id) {
        this.nameToId.set(name, id);
        this.idToName.set(id, name);
    }
    addTask(type, payload, dependsOnNames = [], label) {
        const dependsOn = dependsOnNames.map((name) => {
            const id = this.nameToId.get(name);
            if (!id)
                throw new Error(`动态插入节点时，依赖 "${name}" 不存在于图中。`);
            return id;
        });
        const node = this.createNode(type, payload, dependsOn);
        if (label) {
            this.registerName(label, node.id);
        }
        this.detectCycle();
        this.refreshReadyState();
        return node.id;
    }
    markActive(nodeId) {
        this.updateStatus(nodeId, TASK_STATUS.ACTIVE);
    }
    markCompleted(nodeId) {
        this.updateStatus(nodeId, TASK_STATUS.COMPLETED);
        this.refreshReadyState();
    }
    markFailed(nodeId, error) {
        const node = this.nodes.get(nodeId);
        if (node && error) {
            node.lastError = error;
        }
        this.updateStatus(nodeId, TASK_STATUS.FAILED);
        this.skipDownstream(nodeId);
    }
    incrementRetry(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node)
            return false;
        node.retryCount++;
        node.updatedAt = new Date().toISOString();
        if (node.retryCount > node.maxRetries) {
            this.markFailed(nodeId);
            return false;
        }
        this.updateStatus(nodeId, TASK_STATUS.READY);
        return true;
    }
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    getReadyBatch() {
        return [...this.nodes.values()].filter((n) => n.status === TASK_STATUS.READY);
    }
    getPendingTasks() {
        return [...this.nodes.values()].filter((n) => n.status === TASK_STATUS.PENDING || n.status === TASK_STATUS.READY);
    }
    isComplete() {
        return [...this.nodes.values()].every((n) => n.status === TASK_STATUS.COMPLETED || n.status === TASK_STATUS.SKIPPED || n.status === TASK_STATUS.FAILED);
    }
    hasFailed() {
        return [...this.nodes.values()].some((n) => n.status === TASK_STATUS.FAILED);
    }
    snapshot() {
        const all = [...this.nodes.values()];
        return {
            projectId: this.projectId,
            nodes: all,
            readyBatch: this.getReadyBatch().map((n) => n.id),
            stats: {
                total: all.length,
                pending: all.filter((n) => n.status === TASK_STATUS.PENDING).length,
                active: all.filter((n) => n.status === TASK_STATUS.ACTIVE).length,
                completed: all.filter((n) => n.status === TASK_STATUS.COMPLETED).length,
                failed: all.filter((n) => n.status === TASK_STATUS.FAILED).length,
                skipped: all.filter((n) => n.status === TASK_STATUS.SKIPPED).length,
            },
        };
    }
    createNode(type, payload, dependsOn = []) {
        const now = new Date().toISOString();
        const node = {
            id: randomUUID(),
            type,
            status: TASK_STATUS.PENDING,
            dependsOn,
            payload,
            retryCount: 0,
            maxRetries: 2,
            createdAt: now,
            updatedAt: now,
        };
        this.nodes.set(node.id, node);
        return node;
    }
    updateStatus(nodeId, status) {
        const node = this.nodes.get(nodeId);
        if (!node)
            return;
        node.status = status;
        node.updatedAt = new Date().toISOString();
        if (status === TASK_STATUS.COMPLETED) {
            node.completedAt = node.updatedAt;
        }
    }
    refreshReadyState() {
        for (const node of this.nodes.values()) {
            if (node.status !== TASK_STATUS.PENDING)
                continue;
            const allDepsDone = node.dependsOn.every((depId) => {
                const dep = this.nodes.get(depId);
                return dep?.status === TASK_STATUS.COMPLETED;
            });
            if (allDepsDone) {
                node.status = TASK_STATUS.READY;
                node.updatedAt = new Date().toISOString();
            }
        }
    }
    skipDownstream(failedId) {
        for (const node of this.nodes.values()) {
            if (node.status !== TASK_STATUS.PENDING && node.status !== TASK_STATUS.READY)
                continue;
            if (node.dependsOn.includes(failedId)) {
                node.status = TASK_STATUS.SKIPPED;
                node.updatedAt = new Date().toISOString();
                this.skipDownstream(node.id);
            }
        }
    }
    detectCycle() {
        const inDegree = new Map();
        const all = [...this.nodes.keys()];
        for (const node of this.nodes.values())
            inDegree.set(node.id, node.dependsOn.length);
        const queue = all.filter((id) => (inDegree.get(id) ?? 0) === 0);
        let visited = 0;
        while (queue.length > 0) {
            const cur = queue.shift();
            visited++;
            for (const node of this.nodes.values()) {
                if (!node.dependsOn.includes(cur))
                    continue;
                const newDegree = (inDegree.get(node.id) ?? 1) - 1;
                inDegree.set(node.id, newDegree);
                if (newDegree === 0)
                    queue.push(node.id);
            }
        }
        if (visited < all.length) {
            const cycleNodes = all
                .filter((id) => (inDegree.get(id) ?? 0) > 0)
                .map((id) => this.idToName.get(id) ?? id);
            throw new CyclicDependencyError(cycleNodes);
        }
    }
}
//# sourceMappingURL=TaskGraph.js.map