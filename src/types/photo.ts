export type AnalysisDimension = {
  score: number;
  strengths: string[];
  issues: string[];
  suggestions: string[];
};

export type VisionLabel = {
  label: string;
  score: number;
};

export type VisionProvider = "Local Tools" | "Transformers.js" | "Gemini";

export type VisionTask =
  | "tool-only-analysis"
  | "image-classification"
  | "zero-shot-image-classification"
  | "gemini-vision-analysis";

export type GeminiStructuredAnalysis = {
  overallScore: number;
  sceneType: string;
  composition: AnalysisDimension;
  lighting: AnalysisDimension;
  color: AnalysisDimension;
  techniques: string[];
  shootingRecommendations: string[];
  postProcessingRecommendations: string[];
  detectedLabels: VisionLabel[];
};

export type VisionModelPreset = {
  id: string;
  name: string;
  provider: VisionProvider;
  task: VisionTask;
  model: string;
  description: string;
  defaultConfig: {
    topK: number;
    candidateLabels?: string[];
    hypothesisTemplate?: string;
    temperature?: number;
    responseJson?: boolean;
    apiKeyStorage?: "session" | "local";
  };
};

export type VisionModelConfig = {
  presetId: string;
  provider: VisionProvider;
  task: VisionTask;
  model: string;
  topK: number;
  candidateLabels: string[];
  hypothesisTemplate: string;
  apiKey: string;
  apiKeyStorage: "session" | "local";
  temperature: number;
  responseJson: boolean;
};

export type VisionModelConfigSnapshot = Omit<VisionModelConfig, "apiKey"> & {
  hasApiKey: boolean;
};

export type VisionAnalysis = {
  provider: VisionProvider;
  model: string;
  task: VisionTask;
  config: VisionModelConfigSnapshot;
  status: "real" | "fallback";
  labels: VisionLabel[];
  structuredResult?: GeminiStructuredAnalysis;
  error?: string;
};

export type PhotoAnalysisResult = {
  id: string;
  fileName: string;
  previewUrl: string;
  overallScore: number;
  sceneType: string;
  vision: VisionAnalysis;
  analysis: {
    composition: AnalysisDimension;
    lighting: AnalysisDimension;
    color: AnalysisDimension;
    techniques: string[];
  };
  recommendations: {
    shooting: string[];
    postProcessing: string[];
  };
};

export type UploadedPhoto = {
  id: string;
  file: File;
  fileName: string;
  size: number;
  previewUrl: string;
};

export type AnalysisStatusUpdate = {
  message: string;
  photoName?: string;
};
