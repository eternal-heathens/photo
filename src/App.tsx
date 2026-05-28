import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Play, Sparkles } from "lucide-react";
import { AnalysisResultCard } from "./components/AnalysisResultCard";
import { ModelConfigPanel } from "./components/ModelConfigPanel";
import { PhotoQueue } from "./components/PhotoQueue";
import { UploadZone } from "./components/UploadZone";
import { createDefaultVisionModelConfig } from "./lib/modelPresets";
import { analyzePhotos } from "./lib/mockAnalysis";
import type { PhotoAnalysisResult, UploadedPhoto, VisionModelConfig } from "./types/photo";

const GEMINI_API_KEY_STORAGE_KEY = "photo-analysis-agent-gemini-api-key";

function App() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [results, setResults] = useState<PhotoAnalysisResult[]>([]);
  const [invalidMessage, setInvalidMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [modelConfig, setModelConfig] = useState<VisionModelConfig>(() =>
    createDefaultVisionModelConfig(),
  );
  const photosRef = useRef<UploadedPhoto[]>([]);

  const canAnalyze = photos.length > 0 && !isAnalyzing;

  const resultMap = useMemo(() => {
    return new Map(results.map((result) => [result.id, result]));
  }, [results]);

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
    setPhotos((current) => [...current, ...newPhotos]);
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

    if (modelConfig.provider === "Gemini" && !modelConfig.apiKey.trim()) {
      setInvalidMessage("请先在模型配置中填写 Gemini API Key，或切换到本地 Transformers.js 模型。");
      return;
    }

    setInvalidMessage("");
    setIsAnalyzing(true);
    setAnalysisStatus("准备加载真实 AI 图片识别模型。");

    try {
      const nextResults = await analyzePhotos(photos, modelConfig, ({ message, photoName }) => {
        setAnalysisStatus(photoName ? `${message} 当前：${photoName}` : message);
      });
      setResults(nextResults);
      setAnalysisStatus("已完成真实 AI 图片识别与结构化分析。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-cobalt">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              纯前端 MVP
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
                摄影作品专业分析 Agent
              </h1>
              <p className="max-w-3xl text-base leading-7 text-ink/68">
                上传照片后，系统将从构图、光影、色彩、拍摄技巧等维度进行结构化分析，并给出拍摄优化建议和后期处理建议。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-line bg-white p-3 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink">{photos.length}</p>
              <p className="text-xs text-ink/55">已上传</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink">{results.length}</p>
              <p className="text-xs text-ink/55">已分析</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink">
                {results.length ? Math.round(results.reduce((sum, item) => sum + item.overallScore, 0) / results.length) : 0}
              </p>
              <p className="text-xs text-ink/55">均分</p>
            </div>
          </div>
        </header>

        <UploadZone onAddPhotos={handleAddPhotos} onInvalidFiles={handleInvalidFiles} />

        <ModelConfigPanel
          config={modelConfig}
          disabled={isAnalyzing}
          onChange={setModelConfig}
        />

        {invalidMessage ? (
          <div className="flex items-start gap-2 rounded-lg border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{invalidMessage}</span>
          </div>
        ) : null}

        <PhotoQueue photos={photos} onRemovePhoto={handleRemovePhoto} />

        <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">分析控制</h2>
            <p className="text-sm text-ink/60">
              已接入 Transformers.js，本地运行真实图片识别模型；首次分析会下载模型文件，后续浏览器会缓存。
            </p>
            {analysisStatus ? (
              <p className="mt-1 text-sm font-medium text-cobalt">{analysisStatus}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!canAnalyze}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cobalt px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cobalt/90 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/25"
            onClick={handleAnalyze}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {isAnalyzing ? "分析中" : "开始分析"}
          </button>
        </section>

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
                .filter((result): result is PhotoAnalysisResult => Boolean(result))
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
