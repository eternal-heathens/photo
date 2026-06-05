import type { AnalysisProgressUpdate, AnalysisSignals, PhotoAnalysisV2Result } from "../types/analysisV2";
import type { UploadedPhoto, VisionAnalysis, VisionModelConfig } from "../types/photo";
import { calculateCvMetrics } from "./cvMetrics";
import { extractExifSummary } from "./exifAnalysis";
import { normalizeImage } from "./imageNormalizer";
import { applyPhotoRules } from "./ruleEngine";
import { classifyPhoto, snapshotVisionConfig } from "./visionAnalysis";

type AnalyzePhotosOptions = {
  onProgress?: (update: AnalysisProgressUpdate) => void;
};

const VISION_TIMEOUT_MS = 15000;

function createFallbackVision(config: VisionModelConfig, error: string): VisionAnalysis {
  return {
    provider: config.provider,
    model: config.model,
    task: config.task,
    config: snapshotVisionConfig(config),
    status: "fallback",
    labels: [],
    error,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => window.clearTimeout(timer));
  });
}

async function classifyPhotoWithTimeout(
  photo: UploadedPhoto,
  modelConfig: VisionModelConfig,
): Promise<VisionAnalysis> {
  if (modelConfig.provider === "Local Tools") {
    return createFallbackVision(modelConfig, "极速基础分析未运行视觉模型。");
  }

  if (modelConfig.provider === "Gemini" && !modelConfig.apiKey.trim()) {
    return createFallbackVision(modelConfig, "Gemini 未配置 Key，已跳过云端视觉分析。");
  }

  try {
    return await withTimeout(
      classifyPhoto(photo.file, modelConfig),
      VISION_TIMEOUT_MS,
      `视觉模型超过 ${Math.round(VISION_TIMEOUT_MS / 1000)} 秒未返回，已先使用 CV/EXIF/规则生成基础结果。`,
    );
  } catch (error) {
    return createFallbackVision(
      modelConfig,
      error instanceof Error ? error.message : "视觉模型超时或失败，已使用基础规则降级。",
    );
  }
}

function createFailedResult(photo: UploadedPhoto, message: string): PhotoAnalysisV2Result {
  return {
    id: photo.id,
    fileName: photo.fileName,
    fileSize: photo.size,
    previewUrl: photo.previewUrl,
    createdAt: new Date().toISOString(),
    status: "failed",
    mode: "basic",
    scene: {
      sceneType: "未分类",
      labels: [],
    },
    scores: {
      overall: 0,
      confidence: 0,
    },
    dimensions: [],
    topIssues: [
      {
        id: "issue-01",
        dimension: "technical",
        severity: "high",
        title: "图片分析失败",
        evidence: [message],
        suggestions: ["请确认图片文件可打开，或换一张图片重试。"],
        source: ["rule"],
      },
    ],
    recommendations: [
      {
        id: "rec-01",
        category: "shooting",
        priority: "high",
        title: "重新上传可读取的图片",
        steps: ["确认文件格式为 jpg、png 或 webp。", "如果图片过大，先压缩后再上传。"],
        expectedEffect: "让基础分析流程可以读取画面内容。",
      },
    ],
    comparePlans: [],
    signals: {},
    warnings: [message],
    exportPolicy: {
      containsApiKey: false,
      containsOriginalImage: false,
      gpsRemoved: true,
    },
  };
}

export async function analyzePhotoBasic(
  photo: UploadedPhoto,
  modelConfig: VisionModelConfig,
  onProgress?: (update: AnalysisProgressUpdate) => void,
): Promise<PhotoAnalysisV2Result> {
  const warnings: string[] = [];
  const signals: AnalysisSignals = {};
  const mode = modelConfig.provider === "Gemini" && modelConfig.apiKey.trim() ? "advanced" : "basic";

  try {
    onProgress?.({
      stage: "normalizing",
      message: "正在解码并归一化图片。",
      photoName: photo.fileName,
    });
    const normalizedImage = await normalizeImage(photo.file);

    onProgress?.({
      stage: "cv",
      message: "正在计算曝光、清晰度、色彩和构图指标。",
      photoName: photo.fileName,
    });
    try {
      signals.cv = calculateCvMetrics(normalizedImage);
    } catch (error) {
      warnings.push(error instanceof Error ? `CV 指标失败：${error.message}` : "CV 指标失败。");
    }

    onProgress?.({
      stage: "exif",
      message: "正在读取拍摄参数。",
      photoName: photo.fileName,
    });
    try {
      signals.exif = await extractExifSummary(photo.file);
    } catch (error) {
      warnings.push(error instanceof Error ? `EXIF 解析失败：${error.message}` : "EXIF 解析失败。");
    }

    onProgress?.({
      stage: "vision",
      message: modelConfig.provider === "Local Tools"
        ? "极速基础分析跳过视觉模型。"
        : `正在运行视觉模型识别主体和场景，最多等待 ${Math.round(VISION_TIMEOUT_MS / 1000)} 秒。`,
      photoName: photo.fileName,
    });
    const vision = await classifyPhotoWithTimeout(photo, modelConfig);
    signals.vision = vision;
    if (vision.status === "fallback") {
      warnings.push(vision.error ?? "视觉模型失败，已使用基础规则降级。");
    }

    onProgress?.({
      stage: "rules",
      message: "正在合并信号并生成优化建议。",
      photoName: photo.fileName,
    });
    const result = applyPhotoRules({
      photo,
      signals,
      mode,
      warnings,
    });

    onProgress?.({
      stage: "completed",
      message: "单张分析完成。",
      photoName: photo.fileName,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片分析失败";
    onProgress?.({
      stage: "failed",
      message,
      photoName: photo.fileName,
    });
    return createFailedResult(photo, message);
  }
}

export async function analyzePhotos(
  photos: UploadedPhoto[],
  modelConfig: VisionModelConfig,
  onProgress?: AnalyzePhotosOptions["onProgress"],
): Promise<PhotoAnalysisV2Result[]> {
  const results: PhotoAnalysisV2Result[] = [];

  for (const photo of photos) {
    onProgress?.({
      stage: "queued",
      message: "准备开始分析。",
      photoName: photo.fileName,
    });
    results.push(await analyzePhotoBasic(photo, modelConfig, onProgress));
  }

  return results;
}
