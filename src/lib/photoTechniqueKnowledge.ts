import type { CompareOperation, CompareStrength, IssueSeverity } from "../types/analysisV2";

export type TechniqueSummary = {
  id: string;
  name: string;
  category: "intent" | "exposure" | "focus" | "composition" | "lighting" | "color" | "lens" | "genre" | "post" | "mobile";
  explanation: string;
};

export type ComparePlanTemplate = {
  id: string;
  title: string;
  operation: CompareOperation;
  priority: IssueSeverity;
  strength: CompareStrength;
  techniqueIds: string[];
  summary: string;
  shootingAdvice: string[];
  postAdvice: string[];
  safetyNotes: string[];
};

export const techniqueSummaries: Record<string, TechniqueSummary> = {
  "CMP-001": {
    id: "CMP-001",
    name: "边缘检查",
    category: "composition",
    explanation: "清理画面边缘的亮点、杂物和尴尬切割，避免视线被带离主体。",
  },
  "CMP-017": {
    id: "CMP-017",
    name: "裁切比例",
    category: "composition",
    explanation: "根据主体方向、发布平台和叙事重点选择更合适的画幅比例。",
  },
  "CMP-021": {
    id: "CMP-021",
    name: "水平线位置",
    category: "composition",
    explanation: "风光和空间照片需要用地平线位置决定天空、地面和主体的主次。",
  },
  "EXP-002": {
    id: "EXP-002",
    name: "高光保护",
    category: "exposure",
    explanation: "重要高光一旦失去纹理，后期通常只能压暗，不能真实恢复细节。",
  },
  "EXP-003": {
    id: "EXP-003",
    name: "阴影保留",
    category: "exposure",
    explanation: "暗部可以保留氛围，但主体关键细节需要可读。",
  },
  "EXP-009": {
    id: "EXP-009",
    name: "快门冻结",
    category: "exposure",
    explanation: "运动题材需要用足够快的快门冻结动作，或有意识地选择拖影表达速度。",
  },
  "FOC-001": {
    id: "FOC-001",
    name: "焦点落点",
    category: "focus",
    explanation: "人像优先眼睛，产品优先品牌和材质关键细节。",
  },
  "FOC-013": {
    id: "FOC-013",
    name: "安全快门",
    category: "focus",
    explanation: "快门速度需要同时考虑焦距、主体运动、防抖和手持稳定。",
  },
  "LGT-001": {
    id: "LGT-001",
    name: "光线方向",
    category: "lighting",
    explanation: "侧光和侧逆光可以帮助主体建立体积、轮廓和空间层次。",
  },
  "CLR-001": {
    id: "CLR-001",
    name: "主色控制",
    category: "color",
    explanation: "一张照片通常需要主色、支撑色和强调色，而不是所有颜色都抢主角。",
  },
  "PST-004": {
    id: "PST-004",
    name: "曲线",
    category: "post",
    explanation: "曲线用于建立黑点、白点和中间调层次，是影调优化的核心工具。",
  },
  "PST-009": {
    id: "PST-009",
    name: "降噪",
    category: "post",
    explanation: "降噪需要保护主体纹理，避免把细节处理成蜡质感。",
  },
};

export const compareOperationLabels: Record<CompareOperation, string> = {
  crop: "裁切对比",
  tone: "影调对比",
  color: "色彩对比",
  geometry: "几何校正",
  background: "背景弱化",
  annotation: "标注说明",
  "parameter-card": "参数建议",
};

export function getTechniqueNames(ids: string[]) {
  return ids.map((id) => techniqueSummaries[id]?.name ?? id);
}
