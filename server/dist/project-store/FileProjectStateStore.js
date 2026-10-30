/**
 * project-store/FileProjectStateStore.ts
 * 基于物理磁盘与 project.json 的生产级状态黑板存储实现 (SSOT)
 */
import fs from 'fs';
import path from 'path';
import { config } from '../utils/config.js';
export class FileProjectStateStore {
    projects = new Map();
    constructor() {
        this.hydrateFromDisk();
    }
    hydrateFromDisk() {
        const projectsRoot = config.paths.projects;
        if (!fs.existsSync(projectsRoot)) {
            fs.mkdirSync(projectsRoot, { recursive: true });
            return;
        }
        try {
            const entries = fs.readdirSync(projectsRoot, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const projectJsonPath = path.join(projectsRoot, entry.name, 'project.json');
                    const legacySessionPath = path.join(projectsRoot, entry.name, 'session.json');
                    const targetPath = fs.existsSync(projectJsonPath) ? projectJsonPath : legacySessionPath;
                    if (fs.existsSync(targetPath)) {
                        try {
                            const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
                            const pid = data.projectId || data.id || entry.name;
                            data.projectId = pid;
                            data.id = pid;
                            this.projects.set(pid, data);
                        }
                        catch (err) {
                            console.warn(`[FileProjectStateStore] 无法加载项目快照: ${targetPath}`, err);
                        }
                    }
                }
            }
        }
        catch (e) {
            console.warn('[FileProjectStateStore] 遍历项目目录失败:', e);
        }
    }
    getProject(projectId) {
        if (this.projects.has(projectId)) {
            return this.projects.get(projectId);
        }
        const dir = path.join(config.paths.projects, projectId);
        const targetFile = path.join(dir, 'project.json');
        if (fs.existsSync(targetFile)) {
            try {
                const raw = fs.readFileSync(targetFile, 'utf-8');
                const project = JSON.parse(raw);
                this.projects.set(projectId, project);
                return project;
            }
            catch (e) {
                console.error(`[FileProjectStateStore] 读取项目 ${projectId} 失败:`, e);
            }
        }
        return undefined;
    }
    saveProject(project) {
        const pid = project.projectId;
        project.projectId = pid;
        this.projects.set(pid, project);
        const dir = path.join(config.paths.projects, pid);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const filePath = path.join(dir, 'project.json');
        try {
            fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
        }
        catch (err) {
            console.error(`[FileProjectStateStore] 持久化项目 ${pid} 失败:`, err);
        }
    }
    deleteProject(projectId) {
        this.projects.delete(projectId);
        const dir = path.join(config.paths.projects, projectId);
        if (fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch (e) {
                console.warn(`[FileProjectStateStore] 删除项目目录失败: ${dir}`, e);
            }
        }
    }
    listProjects() {
        return Array.from(this.projects.values());
    }
    getArtifact(projectId, stage) {
        const project = this.getProject(projectId);
        return project?.stageArtifacts?.[stage];
    }
    setArtifact(projectId, stage, artifact) {
        const project = this.getProject(projectId);
        if (project) {
            if (!project.stageArtifacts)
                project.stageArtifacts = {};
            project.stageArtifacts[stage] = artifact;
            project.updatedAt = new Date().toISOString();
            this.saveProject(project);
        }
    }
    getProjectDir(projectId) {
        const dir = path.join(config.paths.projects, projectId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
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
//# sourceMappingURL=FileProjectStateStore.js.map