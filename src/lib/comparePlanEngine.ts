import type {
  AnalysisIssue,
  AnalysisSignals,
  CompareOperation,
  CompareStrength,
  IssueSeverity,
  PhotoComparePlan,
} from "../types/analysisV2";
import type { UploadedPhoto } from "../types/photo";
import { clampScore } from "./utils";

type PlanDraft = Omit<PhotoComparePlan, "id" | "confidence" | "evidence"> & {
  evidence?: string[];
  confidence?: number;
};

const severityRank: Record<IssueSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function createId(index: number) {
  return `compare-${String(index + 1).padStart(2, "0")}`;
}

function operationFilter(operation: CompareOperation, signals: AnalysisSignals) {
  const cv = signals.cv;

  if (operation === "tone") {
    if (!cv) return "none";
    const brightness = cv.exposure.meanLuma < 0.32 ? 1.12 : 1;
    const contrast = cv.contrast.rmsContrast < 0.12 ? 1.12 : 1.04;
    const saturation = cv.color.saturationMean < 0.12 ? 1.08 : 1;
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
  }

  if (operation === "color") {
    if (!cv) return "none";
    const saturation = cv.color.saturationMean > 0.68 ? 0.82 : 1.08;
    return `saturate(${saturation}) contrast(1.03)`;
  }

  if (operation === "background") {
    return "contrast(1.04) saturate(0.88) brightness(0.98)";
  }

  return "none";
}

function createPlan(draft: PlanDraft, index: number, signals: AnalysisSignals): PhotoComparePlan {
  return {
    id: createId(index),
    confidence: draft.confidence ?? clampScore(58 + severityRank[draft.priority] * 11),
    evidence: draft.evidence ?? [],
    ...draft,
    preview: {
      cssFilter: operationFilter(draft.operation, signals),
      ...draft.preview,
    },
  };
}

function issueEvidence(issues: AnalysisIssue[], keywords: string[]) {
  return issues
    .filter((issue) => keywords.some((keyword) => issue.title.includes(keyword)))
    .flatMap((issue) => issue.evidence)
    .slice(0, 3);
}

function hasIssue(issues: AnalysisIssue[], keywords: string[]) {
  return issues.some((issue) => keywords.some((keyword) => issue.title.includes(keyword)));
}

export function buildComparePlans(
  photo: UploadedPhoto,
  signals: AnalysisSignals,
  issues: AnalysisIssue[],
): PhotoComparePlan[] {
  const plans: PlanDraft[] = [];
  const cv = signals.cv;
  const exif = signals.exif;

  if (cv && (hasIssue(issues, ["留白", "边缘"]) || cv.composition.negativeSpaceRatio > 0.58)) {
    plans.push({
      title: "用裁切先集中观看入口",
      operation: "crop",
      priority: cv.composition.negativeSpaceRatio > 0.68 ? "high" : "medium",
      strength: "standard",
      techniqueIds: ["CMP-001", "CMP-017"],
      summary: "先给出 4:5 或 1:1 的裁切预览，把无效留白和边缘干扰从主观看路径里移开。",
      evidence: issueEvidence(issues, ["留白", "边缘"]),
      shootingAdvice: ["下次拍摄前先扫一圈画面边缘。", "同一场景可多拍远、中、近三版，方便后期选择。"],
      postAdvice: ["优先尝试 4:5 竖版裁切。", "保留主体视线或运动方向的空间。"],
      safetyNotes: ["裁切会减少环境信息，适合先作为发布版本预览。"],
      preview: {
        aspectRatio: photo.fileName.match(/panorama|wide/i) ? "16 / 9" : "4 / 5",
        overlayLabels: ["三分线", "被裁区域", "主体安全边距"],
        parameters: [
          { label: "建议比例", value: "4:5 / 1:1" },
          { label: "裁切强度", value: "标准" },
        ],
      },
    });
  }

  if (cv && (hasIssue(issues, ["高光", "暗部", "对比度"]) || cv.exposure.highlightRatio > 0.08 || cv.exposure.shadowRatio > 0.28)) {
    plans.push({
      title: "做一版保守影调对比",
      operation: "tone",
      priority: cv.exposure.highlightRatio > 0.16 || cv.exposure.shadowRatio > 0.42 ? "high" : "medium",
      strength: "conservative",
      techniqueIds: ["EXP-002", "EXP-003", "PST-004"],
      summary: "用保守的亮度、高光、阴影和曲线模拟，让主体更可读，同时避免承诺恢复已丢失细节。",
      evidence: issueEvidence(issues, ["高光", "暗部", "对比度"]),
      shootingAdvice: ["高反差场景优先保护关键高光。", "逆光或暗部主体可现场补一点侧前方柔光。"],
      postAdvice: ["先调整高光和阴影，再微调中间调。", "如果高光已经死白，只做提示，不做虚假恢复。"],
      safetyNotes: ["已丢失的高光纹理无法真实恢复。", "大幅提亮暗部可能放大噪声。"],
      preview: {
        overlayLabels: ["高光保护", "主体中间调", "阴影噪声风险"],
        parameters: [
          { label: "曝光", value: cv.exposure.meanLuma < 0.32 ? "+0.25EV" : "0EV" },
          { label: "高光", value: cv.exposure.highlightRatio > 0.08 ? "-18" : "-8" },
          { label: "阴影", value: cv.exposure.shadowRatio > 0.28 ? "+18" : "+8" },
        ],
      },
    });
  }

  if (cv && hasIssue(issues, ["饱和", "色彩"])) {
    plans.push({
      title: "建立主色和干扰色的对比",
      operation: "color",
      priority: "medium",
      strength: "conservative",
      techniqueIds: ["CLR-001"],
      summary: "保留主体关键色，降低非主体高饱和色块，让画面不靠所有颜色同时用力。",
      evidence: issueEvidence(issues, ["饱和", "色彩"]),
      shootingAdvice: ["拍摄时先观察背景颜色是否抢主体。", "尽量让画面只保留一个主色和一个强调色。"],
      postAdvice: ["先降低全局自然饱和度。", "再用 HSL 单独保留主体关键色。"],
      safetyNotes: ["产品和服装照片需要优先保护真实色准。"],
      preview: {
        overlayLabels: ["主色", "干扰色", "背景降饱和"],
        parameters: [
          { label: "自然饱和度", value: cv.color.saturationMean > 0.68 ? "-18" : "+8" },
          { label: "背景饱和", value: "-20" },
        ],
      },
    });
  }

  if (cv && hasIssue(issues, ["清晰度"])) {
    plans.push({
      title: "用参数卡解释清晰度问题",
      operation: "parameter-card",
      priority: cv.sharpness.edgeDensity < 0.02 ? "high" : "medium",
      strength: "conservative",
      techniqueIds: ["FOC-001", "FOC-013", "EXP-009"],
      summary: "清晰度不足更常来自拍摄端，对比图不强行假修复，而是给快门、对焦和稳定性的复盘卡。",
      evidence: issueEvidence(issues, ["清晰度"]),
      shootingAdvice: ["人像优先检查眼睛焦点。", "运动或街拍优先提高快门速度。", "拍完放大检查关键纹理。"],
      postAdvice: ["只做轻微输出锐化。", "严重失焦不建议包装成清晰修复。"],
      safetyNotes: ["不可恢复失焦不生成虚假清晰版本。"],
      preview: {
        overlayLabels: ["焦点落点", "快门安全线", "锐化风险"],
        parameters: [
          { label: "当前 ISO", value: exif?.iso ? String(exif.iso) : "未知" },
          { label: "当前快门", value: exif?.shutterSpeed ?? "未知" },
          { label: "建议", value: "优先提升拍摄稳定性" },
        ],
      },
    });
  }

  if (exif?.iso && exif.iso >= 1600) {
    plans.push({
      title: "高 ISO 降噪与拍摄复盘",
      operation: "parameter-card",
      priority: exif.iso >= 3200 ? "high" : "medium",
      strength: "conservative",
      techniqueIds: ["EXP-013", "PST-009"],
      summary: "当前 ISO 偏高，后期可以轻降噪，但更重要的是下次拍摄优先补光或稳定相机。",
      evidence: [`ISO ${exif.iso}`],
      shootingAdvice: ["能补光时优先补光。", "静态题材可用三脚架降低 ISO。"],
      postAdvice: ["亮度降噪和彩色降噪分开处理。", "主体纹理区域不要过度降噪。"],
      safetyNotes: ["降噪过强会损失真实纹理。"],
      preview: {
        overlayLabels: ["暗部噪声", "纹理保护"],
        parameters: [
          { label: "ISO", value: String(exif.iso) },
          { label: "降噪策略", value: "轻降噪 + 保护主体纹理" },
        ],
      },
    });
  }

  if (!plans.length && issues.length) {
    plans.push({
      title: "先用标注图解释主要问题",
      operation: "annotation",
      priority: issues[0]?.severity ?? "low",
      strength: "conservative",
      techniqueIds: ["INT-002", "CMP-001"],
      summary: "当前更适合先展示问题位置和建议方向，而不是直接生成修图效果。",
      evidence: issues.slice(0, 3).flatMap((issue) => issue.evidence).slice(0, 3),
      shootingAdvice: ["围绕主体位置、边缘干扰和光线方向重新复拍一版。"],
      postAdvice: ["先做裁切和局部明暗整理，再决定是否进入风格化调色。"],
      safetyNotes: ["标注图只解释建议，不改变原图内容。"],
      preview: {
        overlayLabels: ["主体入口", "边缘干扰", "建议优先级"],
      },
    });
  }

  return plans
    .sort((left, right) => severityRank[right.priority] - severityRank[left.priority])
    .slice(0, 3)
    .map((plan, index) => createPlan(plan, index, signals));
}
