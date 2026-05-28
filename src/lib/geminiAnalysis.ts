import type {
  AnalysisDimension,
  GeminiStructuredAnalysis,
  VisionLabel,
  VisionModelConfig,
} from "../types/photo";
import { clampScore } from "./utils";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const analysisDimensionSchema = {
  type: "object",
  properties: {
    score: { type: "integer" },
    strengths: { type: "array", items: { type: "string" } },
    issues: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["score", "strengths", "issues", "suggestions"],
};

const geminiAnalysisSchema = {
  type: "object",
  properties: {
    overallScore: { type: "integer" },
    sceneType: { type: "string" },
    composition: analysisDimensionSchema,
    lighting: analysisDimensionSchema,
    color: analysisDimensionSchema,
    techniques: { type: "array", items: { type: "string" } },
    shootingRecommendations: { type: "array", items: { type: "string" } },
    postProcessingRecommendations: { type: "array", items: { type: "string" } },
    detectedLabels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          score: { type: "number" },
        },
        required: ["label", "score"],
      },
    },
  },
  required: [
    "overallScore",
    "sceneType",
    "composition",
    "lighting",
    "color",
    "techniques",
    "shootingRecommendations",
    "postProcessingRecommendations",
    "detectedLabels",
  ],
};

function dimensionPrompt() {
  return [
    "你是一名专业摄影分析 Agent。",
    "请只输出 JSON，不要输出自然语言点评。",
    "你需要分析照片的构图、光影、色彩、技巧与风格。",
    "每个数组尽量给出 2 到 4 条可执行、短句化结果。",
    "评分范围是 0 到 100，优先给专业摄影教学场景可用的判断。",
    "sceneType 使用中文短标签，例如：人像、街拍、风光、静物、建筑、旅行纪实、商业产品、夜景。",
    "detectedLabels 是你从画面中识别到的主体、场景、风格或关键视觉元素，score 为 0 到 1。",
  ].join("\n");
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? normalized : fallback;
}

function normalizeDimension(value: unknown, fallback: AnalysisDimension): AnalysisDimension {
  if (!value || typeof value !== "object") return fallback;
  const item = value as Partial<AnalysisDimension>;

  return {
    score: clampScore(Number(item.score ?? fallback.score)),
    strengths: normalizeStringArray(item.strengths, fallback.strengths),
    issues: normalizeStringArray(item.issues, fallback.issues),
    suggestions: normalizeStringArray(item.suggestions, fallback.suggestions),
  };
}

function normalizeLabels(value: unknown): VisionLabel[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = String((item as VisionLabel).label ?? "").trim();
      if (!label) return null;

      return {
        label,
        score: Math.max(0, Math.min(1, Number((item as VisionLabel).score ?? 0))),
      };
    })
    .filter((item): item is VisionLabel => Boolean(item));
}

function normalizeGeminiAnalysis(payload: unknown): GeminiStructuredAnalysis {
  const item = payload && typeof payload === "object" ? payload as Partial<GeminiStructuredAnalysis> : {};

  return {
    overallScore: clampScore(Number(item.overallScore ?? 75)),
    sceneType: typeof item.sceneType === "string" && item.sceneType.trim()
      ? item.sceneType.trim()
      : "未分类",
    composition: normalizeDimension(item.composition, {
      score: 75,
      strengths: ["主体关系可识别"],
      issues: ["构图重点仍需人工复核"],
      suggestions: ["尝试调整机位并比较主体位置"],
    }),
    lighting: normalizeDimension(item.lighting, {
      score: 75,
      strengths: ["光线信息可用"],
      issues: ["高光与暗部需要继续检查"],
      suggestions: ["拍摄时优先保护关键高光"],
    }),
    color: normalizeDimension(item.color, {
      score: 75,
      strengths: ["色彩关系可识别"],
      issues: ["色彩层次需要继续优化"],
      suggestions: ["统一色温并控制饱和度层级"],
    }),
    techniques: normalizeStringArray(item.techniques, ["主体识别", "风格判断"]),
    shootingRecommendations: normalizeStringArray(item.shootingRecommendations, [
      "拍摄时保留主体周围的有效空间",
    ]),
    postProcessingRecommendations: normalizeStringArray(item.postProcessingRecommendations, [
      "使用局部调整突出主体层次",
    ]),
    detectedLabels: normalizeLabels(item.detectedLabels),
  };
}

function extractGeminiText(response: unknown) {
  const candidates = (response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  }).candidates;

  return candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

export async function analyzePhotoWithGemini(
  file: File,
  config: VisionModelConfig,
): Promise<GeminiStructuredAnalysis> {
  if (!config.apiKey.trim()) {
    throw new Error("请先填写 Gemini API Key");
  }

  const base64Image = await fileToBase64(file);
  const response = await fetch(`${GEMINI_ENDPOINT}/${config.model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey.trim(),
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: file.type || "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: dimensionPrompt(),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: config.temperature,
        responseMimeType: config.responseJson ? "application/json" : "text/plain",
        responseJsonSchema: config.responseJson ? geminiAnalysisSchema : undefined,
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = (payload as { error?: { message?: string } }).error?.message;
    throw new Error(message || `Gemini 请求失败：${response.status}`);
  }

  const text = extractGeminiText(payload);
  if (!text.trim()) {
    throw new Error("Gemini 未返回可解析内容");
  }

  return normalizeGeminiAnalysis(JSON.parse(text));
}
