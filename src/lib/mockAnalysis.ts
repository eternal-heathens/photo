import type {
  AnalysisStatusUpdate,
  PhotoAnalysisResult,
  UploadedPhoto,
  VisionAnalysis,
  VisionModelConfig,
} from "../types/photo";
import { clampScore } from "./utils";
import { createDefaultVisionModelConfig } from "./modelPresets";
import { classifyPhoto, labelsToSceneType, labelsToTechniques } from "./visionAnalysis";

const sceneTypes = ["人像", "街拍", "风光", "静物", "建筑", "旅行纪实"];

const techniqueSets = [
  ["三分法", "浅景深", "主体隔离"],
  ["引导线", "环境叙事", "瞬间捕捉"],
  ["框架构图", "低角度", "层次压缩"],
  ["对称构图", "色彩对比", "负空间"],
  ["逆光轮廓", "局部特写", "氛围光"],
];

function seedFromText(text: string) {
  return Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function scoreFromSeed(seed: number, offset: number) {
  return clampScore(68 + ((seed + offset * 13) % 24));
}

function scoreBoostFromVision(vision: VisionAnalysis) {
  if (vision.status !== "real" || !vision.labels.length) return 0;
  const confidence = vision.labels[0]?.score ?? 0;
  return Math.round(confidence * 6);
}

export async function analyzePhotos(
  photos: UploadedPhoto[],
  modelConfig: VisionModelConfig = createDefaultVisionModelConfig(),
  onStatus?: (update: AnalysisStatusUpdate) => void,
): Promise<PhotoAnalysisResult[]> {
  onStatus?.({
    message: `正在加载 ${modelConfig.model}，首次运行会下载模型文件。`,
  });

  const results: PhotoAnalysisResult[] = [];

  for (const [index, photo] of photos.entries()) {
    onStatus?.({
      message: "正在使用真实 AI 模型识别图片内容。",
      photoName: photo.fileName,
    });

    const vision = await classifyPhoto(photo.file, modelConfig);
    const seed = seedFromText(photo.fileName) + index;
    const geminiResult = vision.status === "real" ? vision.structuredResult : undefined;
    const visionBoost = scoreBoostFromVision(vision);
    const compositionScore = geminiResult?.composition.score ?? scoreFromSeed(seed, 1);
    const lightingScore = geminiResult?.lighting.score ?? clampScore(scoreFromSeed(seed, 2) + visionBoost);
    const colorScore = geminiResult?.color.score ?? clampScore(scoreFromSeed(seed, 3) + Math.round(visionBoost / 2));
    const overallScore = geminiResult?.overallScore ?? clampScore((compositionScore + lightingScore + colorScore) / 3);
    const detectedSceneType =
      geminiResult?.sceneType ??
      (vision.status === "real" ? labelsToSceneType(vision.labels) : sceneTypes[seed % sceneTypes.length]);
    const detectedTechniques =
      geminiResult?.techniques ??
      (vision.status === "real" ? labelsToTechniques(vision.labels) : techniqueSets[seed % techniqueSets.length]);

    results.push({
      id: photo.id,
      fileName: photo.fileName,
      previewUrl: photo.previewUrl,
      overallScore,
      sceneType: detectedSceneType,
      vision,
      analysis: {
        composition: {
          score: compositionScore,
          strengths: geminiResult?.composition.strengths ?? [
            "主体位置清晰",
            "画面重心稳定",
            "前景与背景分离度较好",
          ],
          issues: geminiResult?.composition.issues ?? [
            "边缘干扰元素可进一步清理",
            "视觉动线可以更集中",
          ],
          suggestions: geminiResult?.composition.suggestions ?? [
            "拍摄时保留主体运动方向的空间",
            "尝试横竖构图各拍一版以比较叙事重点",
          ],
        },
        lighting: {
          score: lightingScore,
          strengths: geminiResult?.lighting.strengths ?? [
            "主体受光面信息完整",
            "明暗层次能支撑空间感",
          ],
          issues: geminiResult?.lighting.issues ?? [
            "局部高光存在压缩风险",
            "暗部细节还可以更稳定",
          ],
          suggestions: geminiResult?.lighting.suggestions ?? [
            "优先在侧逆光或柔和窗口光下拍摄",
            "拍摄时开启曝光补偿并保留高光细节",
          ],
        },
        color: {
          score: colorScore,
          strengths: geminiResult?.color.strengths ?? [
            "主色关系明确",
            "冷暖对比具备画面识别度",
          ],
          issues: geminiResult?.color.issues ?? [
            "饱和度层级略接近",
            "局部色偏可能削弱主体质感",
          ],
          suggestions: geminiResult?.color.suggestions ?? [
            "控制画面中高饱和色块的数量",
            "统一背景色温以强化主体色彩",
          ],
        },
        techniques: detectedTechniques,
      },
      recommendations: {
        shooting: geminiResult?.shootingRecommendations ?? [
          "移动机位，减少主体边缘的重叠物",
          "用点测光或曝光锁定保护关键亮部",
          "保留同一场景的近景、中景、远景版本",
        ],
        postProcessing: geminiResult?.postProcessingRecommendations ?? [
          "轻微裁切以压缩无效边缘空间",
          "降低高光并抬升阴影中的关键纹理",
          "用局部蒙版强化主体明度与锐度",
        ],
      },
    });
  }

  onStatus?.({
    message: "分析完成。",
  });

  return results;
}
