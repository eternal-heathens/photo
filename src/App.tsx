import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  Images,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnalysisResultCard } from "./components/AnalysisResultCard";
import { ModelConfigPanel } from "./components/ModelConfigPanel";
import { PhotoQueue } from "./components/PhotoQueue";
import { UploadZone } from "./components/UploadZone";
import { analyzePhotos } from "./lib/analysisOrchestrator";
import { createDefaultVisionModelConfig } from "./lib/modelPresets";
import { MAX_PHOTO_BATCH_COUNT } from "./lib/utils";
import type { AnalysisProgressStage, PhotoAnalysisV2Result } from "./types/analysisV2";
import type { UploadedPhoto, VisionModelConfig } from "./types/photo";

const GEMINI_API_KEY_STORAGE_KEY = "photo-analysis-agent-gemini-api-key";

const progressSteps: Array<{ stage: AnalysisProgressStage; label: string }> = [
  { stage: "normalizing", label: "读取图片" },
  { stage: "cv", label: "画质指标" },
  { stage: "exif", label: "拍摄参数" },
  { stage: "vision", label: "视觉信号" },
  { stage: "rules", label: "生成建议" },
  { stage: "completed", label: "完成" },
];

function stageIndex(stage: AnalysisProgressStage | "") {
  return progressSteps.findIndex((item) => item.stage === stage);
}

function getModeMeta(provider: VisionModelConfig["provider"]) {
  if (provider === "Local Tools") {
    return {
      label: "极速基础分析",
      badge: "无等待",
      description: "直接使用 CV、EXIF 和规则引擎，适合先快速拿到可执行建议。",
    };
  }

  if (provider === "Gemini") {
    return {
      label: "高级点评",
      badge: "云端增强",
      description: "适合需要叙事、风格和复杂构图点评的场景，基础结果仍会保留。",
    };
  }

  return {
    label: "本地视觉增强",
    badge: "模型识别",
    description: "在基础指标之外追加本地视觉标签，首次运行可能需要下载模型。",
  };
}

function App() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [results, setResults] = useState<PhotoAnalysisV2Result[]>([]);
  const [invalidMessage, setInvalidMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisStage, setAnalysisStage] = useState<AnalysisProgressStage | "">("");
  const [modelConfig, setModelConfig] = useState<VisionModelConfig>(() =>
    createDefaultVisionModelConfig(),
  );
  const photosRef = useRef<UploadedPhoto[]>([]);

  const canAnalyze = photos.length > 0 && !isAnalyzing;

  const resultMap = useMemo(() => {
    return new Map(results.map((result) => [result.id, result]));
  }, [results]);
  const modeMeta = getModeMeta(modelConfig.provider);
  const currentStageIndex = stageIndex(analysisStage);
  const progressPercent =
    analysisStage === "completed"
      ? 100
      : currentStageIndex >= 0
        ? Math.round(((currentStageIndex + 1) / progressSteps.length) * 100)
        : 0;
  const analyzedAverage = results.length
    ? Math.round(results.reduce((sum, item) => sum + item.scores.overall, 0) / results.length)
    : 0;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    const savedGeminiKey = window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);

    if (savedGeminiKey) {
      setModelConfig((current) => ({
        ...current,
        apiKey: current.provider === "Gemini" ? savedGeminiKey : current.apiKey,
        apiKeyStorage: "local",
      }));
    }
  }, []);

  useEffect(() => {
    if (modelConfig.provider !== "Gemini") return;

    if (modelConfig.apiKeyStorage === "local" && modelConfig.apiKey.trim()) {
      window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, modelConfig.apiKey.trim());
    }

    if (modelConfig.apiKeyStorage === "session") {
      window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  }, [modelConfig.apiKey, modelConfig.apiKeyStorage, modelConfig.provider]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  const handleAddPhotos = (newPhotos: UploadedPhoto[]) => {
    setInvalidMessage("");
    setAnalysisStage("");
    setAnalysisStatus("");
    const availableSlots = Math.max(0, MAX_PHOTO_BATCH_COUNT - photos.length);
    const acceptedPhotos = newPhotos.slice(0, availableSlots);
    const skippedPhotos = newPhotos.slice(availableSlots);

    skippedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));

    if (skippedPhotos.length) {
      setInvalidMessage(`单次最多保留 ${MAX_PHOTO_BATCH_COUNT} 张图片，已自动跳过超出部分。`);
    }

    setPhotos((current) => [...current, ...acceptedPhotos]);
  };

  const handleInvalidFiles = (names: string[]) => {
    setInvalidMessage(`已跳过非图片文件：${names.join("、")}`);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    setResults((current) => current.filter((result) => result.id !== id));
  };

  const handleAnalyze = async () => {
    if (!photos.length) {
      setInvalidMessage("请先上传至少一张图片。");
      return;
    }

    setInvalidMessage("");
    setIsAnalyzing(true);
    setAnalysisStage("queued");
    setAnalysisStatus(
      modelConfig.provider === "Local Tools"
        ? "极速基础分析将直接使用 CV、EXIF 和规则引擎。"
        : modelConfig.provider === "Gemini" && !modelConfig.apiKey.trim()
        ? "Gemini 未配置 Key，将使用本地指标和规则完成基础分析。"
        : "准备执行基础分析流程。",
    );

    try {
      const nextResults = await analyzePhotos(photos, modelConfig, ({ stage, message, photoName }) => {
        setAnalysisStage(stage);
        setAnalysisStatus(photoName ? `${message} 当前：${photoName}` : message);
      });
      setResults(nextResults);
      setAnalysisStage("completed");
      setAnalysisStatus("已完成基础分析、问题识别与优化建议生成。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-line pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-forest-alt/80 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-cobalt">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                建议优先
              </div>
              <div className="space-y-2">
                <h1 className="max-w-4xl font-display text-4xl font-extrabold leading-tight tracking-normal text-ink sm:text-5xl">
                  摄影作品专业分析 Agent
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink/60">
                  一个面向复盘的照片质量诊断工作台：先快速发现问题，再决定是否追加模型点评。
                </p>
              </div>
            </div>
            <div className="grid min-w-full grid-cols-3 rounded-xl border border-line bg-forest-alt/80 p-2 text-center shadow-soft lg:min-w-[420px]">
              <div className="border-r border-line px-3 py-2">
                <p className="font-display text-3xl font-extrabold tabular-nums text-ink">{photos.length}</p>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink/50">已上传</p>
              </div>
              <div className="border-r border-line px-3 py-2">
                <p className="font-display text-3xl font-extrabold tabular-nums text-ink">{results.length}</p>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink/50">已分析</p>
              </div>
              <div className="px-3 py-2">
                <p className="font-display text-3xl font-extrabold tabular-nums text-ink">{analyzedAverage}</p>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink/50">均分</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">1. 上传与队列</h2>
                <p className="text-sm text-ink/60">先收集要复盘的照片，单次最多 {MAX_PHOTO_BATCH_COUNT} 张。</p>
              </div>
              <Images className="h-5 w-5 text-ink/40" aria-hidden="true" />
            </div>
            <UploadZone onAddPhotos={handleAddPhotos} onInvalidFiles={handleInvalidFiles} />
            {invalidMessage ? (
              <div className="flex items-start gap-2 rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{invalidMessage}</span>
              </div>
            ) : null}
            <PhotoQueue photos={photos} onRemovePhoto={handleRemovePhoto} />
          </div>

          <div className="space-y-4 lg:sticky lg:top-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">2. 选择分析方式</h2>
                <p className="text-sm text-ink/60">默认先快出建议，再按需增强。</p>
              </div>
              <Gauge className="h-5 w-5 text-ink/40" aria-hidden="true" />
            </div>
            <ModelConfigPanel
              config={modelConfig}
              disabled={isAnalyzing}
              onChange={setModelConfig}
            />

            <section className="rounded-lg border border-line bg-forest-alt/75 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-cobalt/20 px-2.5 py-1 text-xs font-semibold text-cobalt">
                      {modeMeta.label}
                    </span>
                    <span className="rounded-md bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
                      {modeMeta.badge}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-ink">3. 运行诊断</h2>
                    <p className="text-sm leading-6 text-ink/60">{modeMeta.description}</p>
                  </div>
                  {analysisStatus ? (
                    <p className="rounded-md bg-cream px-3 py-2 text-sm font-medium leading-5 text-dark-ink">
                      {analysisStatus}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!canAnalyze}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-cobalt px-5 text-sm font-semibold text-paper transition hover:bg-cobalt/90 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/50"
                  onClick={handleAnalyze}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isAnalyzing ? "分析中" : "开始分析"}
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink/60">
                  <span>分析进度</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-cobalt transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {(isAnalyzing || analysisStage === "completed") && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                  {progressSteps.map((step, index) => {
                    const isCurrent = analysisStage === step.stage;
                    const isDone = currentStageIndex > index || analysisStage === "completed";

                    return (
                      <div
                        key={step.stage}
                        className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-semibold ${
                          isDone
                            ? "border-cobalt/20 bg-cobalt/10 text-cobalt"
                          : isCurrent
                              ? "border-teal/30 bg-teal/10 text-teal"
                              : "border-line bg-paper/40 text-ink/50"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : isCurrent ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : null}
                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>

        {!photos.length ? (
          <section className="grid gap-3 border-y border-line py-4 text-sm text-ink/60 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-teal" aria-hidden="true" />
              <span>极速基础模式默认不上传原图。</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 text-cobalt" aria-hidden="true" />
              <span>先输出基础建议，模型增强不会阻塞主链路。</span>
            </div>
            <div className="flex items-start gap-2">
              <FileCheck2 className="mt-0.5 h-4 w-4 text-moss" aria-hidden="true" />
              <span>结果可导出 JSON，默认不包含 API Key 和原图。</span>
            </div>
          </section>
        ) : null}

        {photos.length > 0 && results.length > 0 ? (
          <section className="space-y-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-ink">分析结果</h2>
              <p className="text-sm text-ink/60">
                每张照片对应一份结构化结果，可查看原始 JSON 并单独下载。
              </p>
            </div>
            <div className="space-y-6">
              {photos
                .map((photo) => resultMap.get(photo.id))
                .filter((result): result is PhotoAnalysisV2Result => Boolean(result))
                .map((result) => (
                  <AnalysisResultCard key={result.id} result={result} />
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default App;
