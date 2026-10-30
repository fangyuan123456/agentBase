/**
 * project-store/MemoryProjectStateStore.ts
 * 纯内存型状态黑板实现 (针对单元测试与无磁盘依赖场景)
 */
export class MemoryProjectStateStore {
    projects = new Map();
    getProject(projectId) {
        return this.projects.get(projectId);
    }
    saveProject(project) {
        const pid = project.projectId;
        this.projects.set(pid, project);
    }
    deleteProject(projectId) {
        this.projects.delete(projectId);
    }
    listProjects() {
        return Array.from(this.projects.values());
    }
    getArtifact(projectId, stage) {
        return this.projects.get(projectId)?.stageArtifacts?.[stage];
    }
    setArtifact(projectId, stage, artifact) {
        const project = this.projects.get(projectId);
        if (project) {
            if (!project.stageArtifacts)
                project.stageArtifacts = {};
            project.stageArtifacts[stage] = artifact;
            project.updatedAt = new Date().toISOString();
            this.projects.set(projectId, project);
        }
    }
    getProjectDir(projectId) {
        return `/tmp/projects/${projectId}`;
    }
    getSnapshot(projectId) {
        const project = this.getProject(projectId);
        if (!project)
            return undefined;
        return {
            project,
            projectDir: this.getProjectDir(projectId),
            updatedAt: project.updatedAt,
        };
    }
    destroy(projectId) {
        this.projects.delete(projectId);
    }
}
//# sourceMappingURL=MemoryProjectStateStore.js.map