import type { VisionAnalysis, VisionLabel } from "./photo";

export type AnalysisDimensionKey =
  | "composition"
  | "lighting"
  | "color"
  | "technical"
  | "story";

export type AnalysisMode = "basic" | "advanced";

export type SignalSource = "vision" | "cv" | "exif" | "rule" | "advanced";

export type IssueSeverity = "high" | "medium" | "low";

export type RecommendationCategory =
  | "shooting"
  | "postProcessing"
  | "composition"
  | "publishing";

export type NormalizedImage = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageData: ImageData;
  analysisScale: number;
  mimeType: string;
};

export type CvMetrics = {
  exposure: {
    meanLuma: number;
    shadowRatio: number;
    highlightRatio: number;
    dynamicRange: number;
  };
  contrast: {
    rmsContrast: number;
    localContrastProxy: number;
  };
  sharpness: {
    edgeDensity: number;
    laplacianVarianceProxy: number;
  };
  color: {
    saturationMean: number;
    saturationStd: number;
    colorHarmonyProxy: number;
    dominantColorCount: number;
  };
  composition: {
    centerWeight: number;
    ruleOfThirdsProxy: number;
    negativeSpaceRatio: number;
  };
};

export type ExifSummary = {
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLengthMm?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  exposureCompensation?: number;
  takenAt?: string;
  orientation?: number;
  hasGps: boolean;
  gpsRemovedInExport: boolean;
};

export type AdvancedAnalysis = {
  summary: string;
  narrative: string[];
  refinedIssues: AnalysisIssue[];
  refinedRecommendations: Recommendation[];
  confidence: number;
};

export type AnalysisIssue = {
  id: string;
  dimension: AnalysisDimensionKey;
  severity: IssueSeverity;
  title: string;
  evidence: string[];
  suggestions: string[];
  source: SignalSource[];
};

export type Recommendation = {
  id: string;
  category: RecommendationCategory;
  priority: IssueSeverity;
  title: string;
  steps: string[];
  expectedEffect: string;
};

export type CompareOperation =
  | "crop"
  | "tone"
  | "color"
  | "geometry"
  | "background"
  | "annotation"
  | "parameter-card";

export type CompareStrength = "conservative" | "standard" | "visible";

export type PhotoComparePlan = {
  id: string;
  title: string;
  operation: CompareOperation;
  priority: IssueSeverity;
  confidence: number;
  strength: CompareStrength;
  techniqueIds: string[];
  summary: string;
  evidence: string[];
  shootingAdvice: string[];
  postAdvice: string[];
  safetyNotes: string[];
  preview: {
    aspectRatio?: string;
    cssFilter?: string;
    overlayLabels?: string[];
    parameters?: Array<{ label: string; value: string }>;
  };
};

export type DimensionInsight = {
  key: AnalysisDimensionKey;
  title: string;
  score: number;
  confidence: number;
  currentState: string[];
  strengths: string[];
  issues: AnalysisIssue[];
  recommendations: Recommendation[];
  evidence: string[];
};

export type AnalysisSignals = {
  vision?: VisionAnalysis;
  cv?: CvMetrics;
  exif?: ExifSummary;
  advanced?: AdvancedAnalysis;
};

export type PhotoAnalysisV2Result = {
  id: string;
  fileName: string;
  fileSize: number;
  previewUrl: string;
  createdAt: string;
  status: "completed" | "partial" | "failed";
  mode: AnalysisMode;
  scene: {
    sceneType: string;
    labels: VisionLabel[];
  };
  scores: {
    overall: number;
    confidence: number;
  };
  dimensions: DimensionInsight[];
  topIssues: AnalysisIssue[];
  recommendations: Recommendation[];
  comparePlans: PhotoComparePlan[];
  signals: AnalysisSignals;
  warnings: string[];
  exportPolicy: {
    containsApiKey: false;
    containsOriginalImage: false;
    gpsRemoved: boolean;
  };
};

export type AnalysisProgressStage =
  | "queued"
  | "normalizing"
  | "vision"
  | "cv"
  | "exif"
  | "rules"
  | "advanced"
  | "completed"
  | "failed";

export type AnalysisProgressUpdate = {
  stage: AnalysisProgressStage;
  message: string;
  photoName?: string;
};
