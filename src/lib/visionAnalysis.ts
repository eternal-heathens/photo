import { pipeline } from "@huggingface/transformers";
import type {
  VisionAnalysis,
  VisionLabel,
  VisionModelConfig,
  VisionModelConfigSnapshot,
  VisionTask,
} from "../types/photo";
import { analyzePhotoWithGemini } from "./geminiAnalysis";
import { createDefaultVisionModelConfig } from "./modelPresets";

export const VISION_MODEL_ID = "Xenova/vit-base-patch16-224";

type ImageClassifier = (
  image: Blob,
  options?: { top_k?: number },
) => Promise<Array<{ label: string; score: number }>>;

type ZeroShotImageClassifier = (
  image: Blob,
  candidateLabels: string[],
  options?: { hypothesis_template?: string },
) => Promise<Array<{ label: string; score: number }>>;

type VisionPipeline = ImageClassifier | ZeroShotImageClassifier;
type TransformersTask = "image-classification" | "zero-shot-image-classification";

const pipelinePromises = new Map<string, Promise<VisionPipeline>>();

function getPipeline(task: TransformersTask, model: string) {
  const cacheKey = `${task}:${model}`;

  if (!pipelinePromises.has(cacheKey)) {
    pipelinePromises.set(cacheKey, pipeline(task, model, {
      progress_callback: () => undefined,
    }) as unknown as Promise<VisionPipeline>);
  }

  return pipelinePromises.get(cacheKey)!;
}

function normalizeLabels(labels: Array<{ label: string; score: number }>): VisionLabel[] {
  return labels.map((item) => ({
    label: item.label,
    score: Number(item.score.toFixed(4)),
  }));
}

export function snapshotVisionConfig(config: VisionModelConfig): VisionModelConfigSnapshot {
  const { apiKey, ...safeConfig } = config;

  return {
    ...safeConfig,
    hasApiKey: config.provider === "Gemini" && Boolean(apiKey.trim()),
  };
}

export function labelsToSceneType(labels: VisionLabel[]) {
  const labelText = labels.map((item) => item.label.toLowerCase()).join(" ");

  if (/person|face|bride|groom|suit|dress|portrait|kimono/.test(labelText)) return "人像";
  if (/mountain|valley|lakeside|seashore|cliff|forest|volcano|alp|landscape/.test(labelText)) return "风光";
  if (/street|traffic|cab|bus|market|restaurant|shop|building/.test(labelText)) return "街拍";
  if (/vase|cup|bottle|plate|book|camera|fruit|flower|still life|food/.test(labelText)) return "静物";
  if (/palace|church|castle|monastery|dome|tower|bridge|library|architecture/.test(labelText)) return "建筑";

  return "旅行纪实";
}

export function labelsToTechniques(labels: VisionLabel[]) {
  const labelText = labels.map((item) => item.label.toLowerCase()).join(" ");
  const techniques = new Set<string>(["主体识别", "场景分类"]);

  if (/person|face|animal|bird|dog|cat|portrait/.test(labelText)) {
    techniques.add("主体隔离");
    techniques.add("瞬间捕捉");
  }

  if (/mountain|valley|seashore|street|bridge|rail|road|landscape/.test(labelText)) {
    techniques.add("引导线");
    techniques.add("空间层次");
  }

  if (/flower|vase|food|cup|bottle|watch|camera|still life/.test(labelText)) {
    techniques.add("局部特写");
    techniques.add("浅景深");
  }

  if (/church|palace|castle|tower|building|dome|architecture/.test(labelText)) {
    techniques.add("对称构图");
    techniques.add("结构线条");
  }

  return Array.from(techniques).slice(0, 5);
}

async function runImageClassification(file: File, config: VisionModelConfig) {
  const classifier = (await getPipeline("image-classification", config.model)) as ImageClassifier;
  return classifier(file, { top_k: config.topK });
}

async function runZeroShotImageClassification(file: File, config: VisionModelConfig) {
  const classifier = (await getPipeline("zero-shot-image-classification", config.model)) as ZeroShotImageClassifier;
  const candidateLabels = config.candidateLabels.filter(Boolean);

  if (!candidateLabels.length) {
    throw new Error("零样本模型需要至少一个候选标签");
  }

  const output = await classifier(file, candidateLabels, {
    hypothesis_template: config.hypothesisTemplate,
  });

  return output.slice(0, config.topK);
}

export async function classifyPhoto(
  file: File,
  config = createDefaultVisionModelConfig(),
): Promise<VisionAnalysis> {
  try {
    if (config.provider === "Gemini") {
      const structuredResult = await analyzePhotoWithGemini(file, config);

      return {
        provider: "Gemini",
        model: config.model,
        task: config.task,
        config: snapshotVisionConfig(config),
        status: "real",
        labels: structuredResult.detectedLabels,
        structuredResult,
      };
    }

    const rawLabels =
      config.task === "zero-shot-image-classification"
        ? await runZeroShotImageClassification(file, config)
        : await runImageClassification(file, config);
    const labels = normalizeLabels(rawLabels);

    return {
      provider: "Transformers.js",
      model: config.model,
      task: config.task,
      config: snapshotVisionConfig(config),
      status: "real",
      labels,
    };
  } catch (error) {
    return {
      provider: config.provider,
      model: config.model,
      task: config.task,
      config: snapshotVisionConfig(config),
      status: "fallback",
      labels: [],
      error: error instanceof Error ? error.message : "模型加载或图片识别失败",
    };
  }
}
