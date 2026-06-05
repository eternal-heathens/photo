import type { VisionModelConfig, VisionModelPreset } from "../types/photo";

export const VISION_MODEL_PRESETS: VisionModelPreset[] = [
  {
    id: "local-tools-basic",
    name: "极速基础分析",
    provider: "Local Tools",
    task: "tool-only-analysis",
    model: "cv-exif-rule-engine",
    description: "不等待模型下载，直接用 CV 指标、EXIF 和规则引擎生成基础建议。",
    defaultConfig: {
      topK: 0,
    },
  },
  {
    id: "vit-imagenet",
    name: "ViT 快速通用识别",
    provider: "Transformers.js",
    task: "image-classification",
    model: "Xenova/vit-base-patch16-224",
    description: "浏览器本地通用图片分类，作为基础分析的默认轻量视觉信号；超时会自动降级到 CV/EXIF/规则。",
    defaultConfig: {
      topK: 5,
    },
  },
  {
    id: "clip-scene-zero-shot",
    name: "CLIP 场景判断",
    provider: "Transformers.js",
    task: "zero-shot-image-classification",
    model: "Xenova/clip-vit-base-patch32",
    description: "使用候选摄影场景做零样本分类，适合按业务标签判断照片类型。",
    defaultConfig: {
      topK: 5,
      candidateLabels: [
        "portrait photography",
        "street photography",
        "landscape photography",
        "still life photography",
        "architecture photography",
        "travel documentary photography",
        "food photography",
        "night photography",
      ],
      hypothesisTemplate: "This is a photo of {}.",
    },
  },
  {
    id: "gemini-2-5-flash-photo",
    name: "Gemini 2.5 Flash 高级分析",
    provider: "Gemini",
    task: "gemini-vision-analysis",
    model: "gemini-2.5-flash",
    description: "可选云端多模态分析，适合补充深度点评；基础分析不依赖它。",
    defaultConfig: {
      topK: 8,
      temperature: 0.2,
      responseJson: true,
      apiKeyStorage: "session",
    },
  },
];

export function createDefaultVisionModelConfig(): VisionModelConfig {
  const preset = VISION_MODEL_PRESETS[0];

  return {
    presetId: preset.id,
    provider: preset.provider,
    task: preset.task,
    model: preset.model,
    topK: preset.defaultConfig.topK,
    candidateLabels: preset.defaultConfig.candidateLabels ?? [],
    hypothesisTemplate: preset.defaultConfig.hypothesisTemplate ?? "This is a photo of {}.",
    apiKey: "",
    apiKeyStorage: preset.defaultConfig.apiKeyStorage ?? "session",
    temperature: preset.defaultConfig.temperature ?? 0.2,
    responseJson: preset.defaultConfig.responseJson ?? true,
  };
}

export function createConfigFromPreset(presetId: string): VisionModelConfig {
  const preset =
    VISION_MODEL_PRESETS.find((item) => item.id === presetId) ?? VISION_MODEL_PRESETS[0];

  return {
    presetId: preset.id,
    provider: preset.provider,
    task: preset.task,
    model: preset.model,
    topK: preset.defaultConfig.topK,
    candidateLabels: preset.defaultConfig.candidateLabels ?? [],
    hypothesisTemplate: preset.defaultConfig.hypothesisTemplate ?? "This is a photo of {}.",
    apiKey: "",
    apiKeyStorage: preset.defaultConfig.apiKeyStorage ?? "session",
    temperature: preset.defaultConfig.temperature ?? 0.2,
    responseJson: preset.defaultConfig.responseJson ?? true,
  };
}

export function getPresetById(presetId: string) {
  return VISION_MODEL_PRESETS.find((item) => item.id === presetId) ?? VISION_MODEL_PRESETS[0];
}
