import type {
  AdvancedAnalysis,
  AnalysisDimensionKey,
  AnalysisIssue,
  AnalysisSignals,
  DimensionInsight,
  IssueSeverity,
  PhotoAnalysisV2Result,
  Recommendation,
  RecommendationCategory,
} from "../types/analysisV2";
import type { UploadedPhoto, VisionLabel } from "../types/photo";
import { buildComparePlans } from "./comparePlanEngine";
import { clampScore } from "./utils";
import { labelsToSceneType, labelsToTechniques } from "./visionAnalysis";

type RuleEngineInput = {
  photo: UploadedPhoto;
  signals: AnalysisSignals;
  mode: "basic" | "advanced";
  warnings: string[];
};

type DraftIssue = Omit<AnalysisIssue, "id">;
type DraftRecommendation = Omit<Recommendation, "id">;

const dimensionTitles: Record<AnalysisDimensionKey, string> = {
  composition: "构图与画面组织",
  lighting: "光影与曝光",
  color: "色彩与氛围",
  technical: "清晰度与拍摄参数",
  story: "主体与叙事",
};

const severityPenalty: Record<IssueSeverity, number> = {
  high: 18,
  medium: 10,
  low: 5,
};

function createId(prefix: string, index: number) {
  return `${prefix}-${String(index + 1).padStart(2, "0")}`;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function severityRank(severity: IssueSeverity) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function addIssue(
  issues: DraftIssue[],
  recommendations: DraftRecommendation[],
  issue: DraftIssue,
  recommendation: DraftRecommendation,
) {
  issues.push(issue);
  recommendations.push(recommendation);
}

function scoreDimension(key: AnalysisDimensionKey, issues: AnalysisIssue[], base = 86) {
  const penalty = issues
    .filter((issue) => issue.dimension === key)
    .reduce((sum, issue) => sum + severityPenalty[issue.severity], 0);

  return clampScore(base - penalty);
}

function confidenceFromSignals(signals: AnalysisSignals) {
  let confidence = 54;
  if (signals.cv) confidence += 20;
  if (signals.vision?.status === "real" && signals.vision.labels.length) confidence += 12;
  if (signals.exif && (signals.exif.iso || signals.exif.aperture || signals.exif.shutterSpeed)) confidence += 8;
  if (signals.advanced) confidence += 6;
  return clampScore(confidence);
}

function buildCurrentState(key: AnalysisDimensionKey, signals: AnalysisSignals, labels: VisionLabel[]) {
  const cv = signals.cv;
  const exif = signals.exif;

  if (key === "composition") {
    return [
      cv
        ? `画面留白约 ${formatPercent(cv.composition.negativeSpaceRatio)}，三分线附近能量 ${formatPercent(cv.composition.ruleOfThirdsProxy)}。`
        : "暂未获取构图指标，当前依赖模型标签和规则判断。",
      labels.length ? `识别到 ${labels.slice(0, 3).map((item) => item.label).join("、")} 等视觉元素。` : "主体标签不足，需要结合人工观察复核。",
    ];
  }

  if (key === "lighting") {
    return [
      cv
        ? `平均亮度 ${formatPercent(cv.exposure.meanLuma)}，暗部占比 ${formatPercent(cv.exposure.shadowRatio)}，高光占比 ${formatPercent(cv.exposure.highlightRatio)}。`
        : "暂未获取曝光指标。",
      cv ? `动态范围估计为 ${formatPercent(cv.exposure.dynamicRange)}。` : "建议结合直方图继续检查高光和暗部。",
    ];
  }

  if (key === "color") {
    return [
      cv
        ? `平均饱和度 ${formatPercent(cv.color.saturationMean)}，主要色块约 ${cv.color.dominantColorCount} 组。`
        : "暂未获取色彩指标。",
      cv ? `色彩协调代理分 ${formatPercent(cv.color.colorHarmonyProxy)}。` : "需要结合画面主题判断色彩是否统一。",
    ];
  }

  if (key === "technical") {
    return [
      cv
        ? `边缘密度 ${formatPercent(cv.sharpness.edgeDensity)}，清晰度代理分 ${formatPercent(cv.sharpness.laplacianVarianceProxy)}。`
        : "暂未获取清晰度指标。",
      exif?.iso || exif?.aperture || exif?.shutterSpeed
        ? `拍摄参数：ISO ${exif.iso ?? "未知"}，光圈 f/${exif.aperture ?? "未知"}，快门 ${exif.shutterSpeed ?? "未知"}。`
        : "未读取到可用拍摄参数。",
    ];
  }

  return [
    labels.length
      ? `当前更接近 ${labelsToSceneType(labels)} 场景，主体和场景识别有可用依据。`
      : "当前缺少稳定主体识别，需要依靠画面指标给出基础建议。",
    `可用技巧线索：${labelsToTechniques(labels).join("、")}。`,
  ];
}

function buildStrengths(key: AnalysisDimensionKey, signals: AnalysisSignals, labels: VisionLabel[]) {
  const cv = signals.cv;
  const strengths: string[] = [];

  if (key === "composition") {
    if (!cv || cv.composition.negativeSpaceRatio < 0.5) strengths.push("画面信息量相对稳定，没有明显大面积无效区域。");
    if (labels.length) strengths.push("主体或场景标签可识别，后续建议可以围绕明确对象展开。");
  }

  if (key === "lighting") {
    if (cv && cv.exposure.meanLuma >= 0.32 && cv.exposure.meanLuma <= 0.72) strengths.push("整体曝光落在较安全区间。");
    if (cv && cv.exposure.dynamicRange > 0.45) strengths.push("明暗层次具备一定展开空间。");
  }

  if (key === "color") {
    if (cv && cv.color.saturationMean >= 0.18 && cv.color.saturationMean <= 0.58) strengths.push("色彩饱和度较克制，后期调整空间较好。");
    if (cv && cv.color.dominantColorCount <= 8) strengths.push("主色数量没有过度发散。");
  }

  if (key === "technical") {
    if (cv && cv.sharpness.edgeDensity >= 0.05) strengths.push("画面边缘信息可用，基础清晰度有支撑。");
    if (signals.exif?.iso && signals.exif.iso <= 800) strengths.push("ISO 较低，噪点风险相对可控。");
  }

  if (key === "story") {
    if (labels.length) strengths.push("画面具备可识别主题，可继续强化叙事重点。");
    if (labelsToTechniques(labels).length > 2) strengths.push("可提取出多种摄影技巧线索。");
  }

  return strengths.length ? strengths : ["当前维度没有发现明显硬伤，建议结合拍摄目的继续微调。"];
}

function buildDimension(
  key: AnalysisDimensionKey,
  signals: AnalysisSignals,
  labels: VisionLabel[],
  allIssues: AnalysisIssue[],
  allRecommendations: Recommendation[],
) {
  const issues = allIssues.filter((issue) => issue.dimension === key);
  const recommendations = allRecommendations.filter((item) =>
    issues.some((issue) => item.priority === issue.severity || item.category === categoryForDimension(key)),
  );

  return {
    key,
    title: dimensionTitles[key],
    score: scoreDimension(key, allIssues),
    confidence: confidenceFromSignals(signals),
    currentState: buildCurrentState(key, signals, labels),
    strengths: buildStrengths(key, signals, labels),
    issues,
    recommendations: recommendations.slice(0, 4),
    evidence: unique(issues.flatMap((issue) => issue.evidence)).slice(0, 5),
  } satisfies DimensionInsight;
}

function categoryForDimension(key: AnalysisDimensionKey): RecommendationCategory {
  if (key === "color") return "postProcessing";
  if (key === "composition") return "composition";
  if (key === "story") return "publishing";
  return "shooting";
}

function buildAdvancedFromVision(signals: AnalysisSignals): AdvancedAnalysis | undefined {
  const structured = signals.vision?.structuredResult;
  if (!structured) return signals.advanced;

  return {
    summary: `高级模型认为这张照片属于${structured.sceneType}，综合表现约 ${structured.overallScore} 分。`,
    narrative: [
      ...structured.techniques.slice(0, 3).map((item) => `可继续利用「${item}」强化画面表达。`),
    ],
    refinedIssues: [],
    refinedRecommendations: [
      ...structured.shootingRecommendations.slice(0, 2).map((item, index) => ({
        id: createId("advanced-shoot", index),
        category: "shooting" as const,
        priority: "medium" as const,
        title: item,
        steps: [item],
        expectedEffect: "补充高级模型给出的拍摄优化方向。",
      })),
      ...structured.postProcessingRecommendations.slice(0, 2).map((item, index) => ({
        id: createId("advanced-post", index),
        category: "postProcessing" as const,
        priority: "medium" as const,
        title: item,
        steps: [item],
        expectedEffect: "补充高级模型给出的后期优化方向。",
      })),
    ],
    confidence: 0.78,
  };
}

export function applyPhotoRules({ photo, signals, mode, warnings }: RuleEngineInput): PhotoAnalysisV2Result {
  const cv = signals.cv;
  const exif = signals.exif;
  const labels = signals.vision?.labels ?? [];
  const sceneType = signals.vision?.structuredResult?.sceneType ?? labelsToSceneType(labels);
  const draftIssues: DraftIssue[] = [];
  const draftRecommendations: DraftRecommendation[] = [];

  if (cv) {
    if (cv.exposure.highlightRatio > 0.08) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "lighting",
          severity: cv.exposure.highlightRatio > 0.16 ? "high" : "medium",
          title: "高光区域存在溢出风险",
          evidence: [`高光占比 ${formatPercent(cv.exposure.highlightRatio)}`],
          suggestions: ["拍摄时降低曝光补偿，优先保护人脸、天空、白色物体等关键高光。"],
          source: ["cv", "rule"],
        },
        {
          category: "shooting",
          priority: cv.exposure.highlightRatio > 0.16 ? "high" : "medium",
          title: "拍摄时优先保护关键高光",
          steps: ["开启曝光补偿 -0.3 到 -1EV。", "使用点测光或曝光锁定测量主体亮部。"],
          expectedEffect: "减少亮部死白，保留后期恢复空间。",
        },
      );
    }

    if (cv.exposure.shadowRatio > 0.28 || cv.exposure.meanLuma < 0.28) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "lighting",
          severity: cv.exposure.shadowRatio > 0.42 ? "high" : "medium",
          title: "暗部面积偏大，主体细节可能不足",
          evidence: [`暗部占比 ${formatPercent(cv.exposure.shadowRatio)}`, `平均亮度 ${formatPercent(cv.exposure.meanLuma)}`],
          suggestions: ["补充侧前方柔光，或在后期用局部蒙版抬升主体暗部。"],
          source: ["cv", "rule"],
        },
        {
          category: "postProcessing",
          priority: cv.exposure.shadowRatio > 0.42 ? "high" : "medium",
          title: "局部抬升主体暗部",
          steps: ["用蒙版选择主体区域。", "小幅提升阴影和中间调，避免整体变灰。"],
          expectedEffect: "增强主体可读性，同时保留现场氛围。",
        },
      );
    }

    if (cv.sharpness.edgeDensity < 0.035 || cv.sharpness.laplacianVarianceProxy < 0.2) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "technical",
          severity: cv.sharpness.edgeDensity < 0.02 ? "high" : "medium",
          title: "清晰度指标偏低",
          evidence: [`边缘密度 ${formatPercent(cv.sharpness.edgeDensity)}`, `清晰度代理分 ${formatPercent(cv.sharpness.laplacianVarianceProxy)}`],
          suggestions: ["检查快门速度、对焦点和手持稳定性，后期锐化只做小幅补偿。"],
          source: ["cv", "rule"],
        },
        {
          category: "shooting",
          priority: cv.sharpness.edgeDensity < 0.02 ? "high" : "medium",
          title: "提高拍摄稳定性和对焦确定性",
          steps: ["人像或街拍优先使用更高快门。", "拍摄后放大检查主体眼部、文字或边缘区域。"],
          expectedEffect: "降低运动模糊和手抖带来的不可逆损失。",
        },
      );
    }

    if (cv.contrast.rmsContrast < 0.12) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "lighting",
          severity: "low",
          title: "画面对比度偏弱",
          evidence: [`RMS 对比度 ${formatPercent(cv.contrast.rmsContrast)}`],
          suggestions: ["后期可通过曲线或局部对比提升主体层次。"],
          source: ["cv", "rule"],
        },
        {
          category: "postProcessing",
          priority: "low",
          title: "用曲线增加局部层次",
          steps: ["轻微压暗阴影并抬高中间调。", "避免全局对比过强导致细节丢失。"],
          expectedEffect: "提升画面立体感和视觉抓取力。",
        },
      );
    }

    if (cv.color.saturationMean > 0.68) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "color",
          severity: "medium",
          title: "整体饱和度偏高",
          evidence: [`平均饱和度 ${formatPercent(cv.color.saturationMean)}`],
          suggestions: ["降低非主体色彩饱和度，让主体色更有层级。"],
          source: ["cv", "rule"],
        },
        {
          category: "postProcessing",
          priority: "medium",
          title: "控制非主体高饱和色块",
          steps: ["先降低全局自然饱和度。", "再用 HSL 单独保留主体关键色。"],
          expectedEffect: "减少廉价感和视觉噪音。",
        },
      );
    }

    if (cv.color.saturationMean < 0.12 && cv.exposure.dynamicRange < 0.38) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "color",
          severity: "low",
          title: "色彩和明暗层次都偏平",
          evidence: [`平均饱和度 ${formatPercent(cv.color.saturationMean)}`, `动态范围 ${formatPercent(cv.exposure.dynamicRange)}`],
          suggestions: ["明确照片要保留低饱和风格，或通过白平衡和曲线增加层次。"],
          source: ["cv", "rule"],
        },
        {
          category: "postProcessing",
          priority: "low",
          title: "建立更清晰的色彩层级",
          steps: ["先校准白平衡。", "对主体和背景使用不同的明度或饱和度层级。"],
          expectedEffect: "让低饱和照片不显得发灰。",
        },
      );
    }

    if (cv.composition.negativeSpaceRatio > 0.62) {
      addIssue(
        draftIssues,
        draftRecommendations,
        {
          dimension: "composition",
          severity: "medium",
          title: "无效留白比例偏高",
          evidence: [`留白比例 ${formatPercent(cv.composition.negativeSpaceRatio)}`],
          suggestions: ["重新裁切边缘空间，或让留白服务于方向、孤独感、尺度关系。"],
          source: ["cv", "rule"],
        },
        {
          category: "composition",
          priority: "medium",
          title: "裁掉不服务主题的边缘空间",
          steps: ["保留主体视线或运动方向的空间。", "优先清理亮色、杂乱或切边干扰。"],
          expectedEffect: "让观看路径更集中。",
        },
      );
    }
  }

  if (exif?.iso && exif.iso >= 1600) {
    addIssue(
      draftIssues,
      draftRecommendations,
      {
        dimension: "technical",
        severity: exif.iso >= 3200 ? "high" : "medium",
        title: "高 ISO 可能带来噪点和细节损失",
        evidence: [`ISO ${exif.iso}`],
        suggestions: ["优先增加环境光或使用更大光圈，后期降噪时保护主体纹理。"],
        source: ["exif", "rule"],
      },
      {
        category: "shooting",
        priority: exif.iso >= 3200 ? "high" : "medium",
        title: "降低高 ISO 带来的噪点风险",
        steps: ["能补光时优先补光。", "后期降噪和锐化分开处理，避免蜡质感。"],
        expectedEffect: "提升暗部纯净度和细节可信度。",
      },
    );
  }

  if (!labels.length) {
    draftIssues.push({
      dimension: "story",
      severity: "low",
      title: "主体识别信号不足",
      evidence: ["本地模型未返回稳定标签"],
      suggestions: ["通过更明确的主体位置、背景分离或标题说明强化表达。"],
      source: ["vision", "rule"],
    });
  }

  const issues = draftIssues.map((issue, index) => ({
    id: createId("issue", index),
    ...issue,
  }));
  const recommendations = draftRecommendations.map((recommendation, index) => ({
    id: createId("rec", index),
    ...recommendation,
  }));
  const advanced = buildAdvancedFromVision(signals);
  const mergedSignals: AnalysisSignals = advanced ? { ...signals, advanced } : signals;
  const dimensions = (["composition", "lighting", "color", "technical", "story"] as AnalysisDimensionKey[])
    .map((key) => buildDimension(key, mergedSignals, labels, issues, recommendations));
  const topIssues = [...issues]
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 5);
  const advancedRecommendations = advanced?.refinedRecommendations ?? [];
  const allRecommendations = [...recommendations, ...advancedRecommendations].slice(0, 10);
  const comparePlans = buildComparePlans(photo, mergedSignals, topIssues);
  const overall = clampScore(
    dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / Math.max(1, dimensions.length),
  );

  return {
    id: photo.id,
    fileName: photo.fileName,
    fileSize: photo.size,
    previewUrl: photo.previewUrl,
    createdAt: new Date().toISOString(),
    status: warnings.length ? "partial" : "completed",
    mode,
    scene: {
      sceneType,
      labels,
    },
    scores: {
      overall,
      confidence: confidenceFromSignals(mergedSignals),
    },
    dimensions,
    topIssues,
    recommendations: allRecommendations.length
      ? allRecommendations
      : [
          {
            id: "rec-01",
            category: "shooting",
            priority: "low",
            title: "继续围绕主体关系做对比拍摄",
            steps: ["同一场景拍摄远中近三版。", "比较主体位置、边缘干扰和光线方向。"],
            expectedEffect: "积累可复盘样本，让建议从单张判断变成系列改进。",
          },
        ],
    comparePlans,
    signals: mergedSignals,
    warnings,
    exportPolicy: {
      containsApiKey: false,
      containsOriginalImage: false,
      gpsRemoved: mergedSignals.exif?.gpsRemovedInExport ?? true,
    },
  };
}
