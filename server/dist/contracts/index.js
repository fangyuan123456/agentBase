/**
 * contracts/index.ts
 * 互动影游与多智能体导演全链路数据契约 (SSOT)
 */
export var WorkflowStage;
(function (WorkflowStage) {
    WorkflowStage["INIT"] = "init";
    WorkflowStage["NARRATIVE_DESIGN"] = "narrative_design";
    WorkflowStage["CHARACTER_DESIGN"] = "character_design";
    WorkflowStage["SCENE_SCRIPT"] = "scene_script";
    WorkflowStage["STORYBOARD"] = "storyboard";
    WorkflowStage["KEYFRAME_REFERENCE"] = "keyframe_reference";
    WorkflowStage["VIDEO_PRODUCTION"] = "video_production";
    WorkflowStage["FMV_PACKAGING"] = "fmv_packaging";
    WorkflowStage["COMPLETED"] = "completed";
})(WorkflowStage || (WorkflowStage = {}));
export const STAGE_SEQUENCE = [
    WorkflowStage.NARRATIVE_DESIGN,
    WorkflowStage.CHARACTER_DESIGN,
    WorkflowStage.SCENE_SCRIPT,
    WorkflowStage.STORYBOARD,
    WorkflowStage.KEYFRAME_REFERENCE,
    WorkflowStage.VIDEO_PRODUCTION,
    WorkflowStage.FMV_PACKAGING,
];
/** 互动影游特定工序 Agent 角色业务定义 */
export const FILM_AGENT_ROLES = {
    DIRECTOR: 'DIRECTOR',
    NARRATIVE_DESIGNER: 'NARRATIVE_DESIGNER',
    CHARACTER_DESIGNER: 'CHARACTER_DESIGNER',
    SCENE_SCRIPT: 'SCENE_SCRIPT',
    STORYBOARD: 'STORYBOARD',
    KEYFRAME_REFERENCE: 'KEYFRAME_REFERENCE',
    VIDEO_PRODUCTION: 'VIDEO_PRODUCTION',
    AUDIO_DIRECTOR: 'AUDIO_DIRECTOR',
    FMV_PACKAGER: 'FMV_PACKAGER',
    DOCTOR: 'DOCTOR',
};
export var SessionStatus;
(function (SessionStatus) {
    SessionStatus["IDLE"] = "idle";
    SessionStatus["RUNNING"] = "running";
    SessionStatus["WAITING_FOR_INTERVENTION"] = "waiting_for_intervention";
    SessionStatus["COMPLETED"] = "completed";
    SessionStatus["FAILED"] = "failed";
})(SessionStatus || (SessionStatus = {}));
//# sourceMappingURL=index.js.map