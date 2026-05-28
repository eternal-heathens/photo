import type { VisionModelConfig, VisionModelPreset } from "../types/photo";

export const VISION_MODEL_PRESETS: VisionModelPreset[] = [
  {
    id: "gemini-2-5-flash-photo",
    name: "Gemini 2.5 Flash 高维分析",
    provider: "Gemini",
    task: "gemini-vision-analysis",
    model: "gemini-2.5-flash",
    description: "云端多模态模型，直接输出摄影结构化 JSON，适合更高质量分析。",
    defaultConfig: {
      topK: 8,
      temperature: 0.2,
      responseJson: true,
      apiKeyStorage: "session",
    },
  },
  {
    id: "vit-imagenet",
    name: "ViT 通用识别",
    provider: "Transformers.js",
    task: "image-classification",
    model: "Xenova/vit-base-patch16-224",
    description: "ImageNet 通用图片分类，适合识别主体与基础场景。",
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
