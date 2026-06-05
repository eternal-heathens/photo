import {
  BrainCircuit,
  Cpu,
  Gauge,
  KeyRound,
  ListChecks,
  ShieldAlert,
  SlidersHorizontal,
  Thermometer,
  Wand2,
} from "lucide-react";
import type { VisionModelConfig } from "../types/photo";
import { createConfigFromPreset, getPresetById, VISION_MODEL_PRESETS } from "../lib/modelPresets";

type ModelConfigPanelProps = {
  config: VisionModelConfig;
  disabled?: boolean;
  onChange: (config: VisionModelConfig) => void;
};

function parseCandidateLabels(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ModelConfigPanel({ config, disabled = false, onChange }: ModelConfigPanelProps) {
  const selectedPreset = getPresetById(config.presetId);
  const isZeroShot = config.task === "zero-shot-image-classification";
  const isGemini = config.provider === "Gemini";
  const isLocalTools = config.provider === "Local Tools";
  const modePresets = [
    {
      id: "local-tools-basic",
      title: "极速基础",
      icon: <Gauge className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "vit-imagenet",
      title: "本地识别",
      icon: <Cpu className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: "gemini-2-5-flash-photo",
      title: "高级点评",
      icon: <Wand2 className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const handlePresetChange = (presetId: string) => {
    const nextConfig = createConfigFromPreset(presetId);
    onChange({
      ...nextConfig,
      apiKey: config.apiKey,
    });
  };

  return (
    <section className="rounded-lg border border-line bg-forest-alt/75 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cream text-dark-ink">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 className="font-semibold text-ink">模型配置</h2>
            <p className="text-sm leading-6 text-ink/60">{selectedPreset.description}</p>
          </div>
        </div>
        <span className="w-fit rounded-md bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
          {isLocalTools ? "本地工具" : selectedPreset.provider}
        </span>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {modePresets.map((preset) => {
          const isActive = config.presetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              className={`flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? "border-cobalt bg-cobalt text-paper"
                  : "border-line bg-paper/40 text-ink/70 hover:border-cobalt hover:bg-cobalt/10 hover:text-cobalt"
              }`}
              onClick={() => handlePresetChange(preset.id)}
            >
              {preset.icon}
              {preset.title}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <Cpu className="h-4 w-4 text-ink/50" aria-hidden="true" />
            模型
          </span>
          <select
            className="h-11 w-full rounded-md border border-line bg-paper/60 px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper/40"
            value={config.presetId}
            disabled={disabled}
            onChange={(event) => handlePresetChange(event.target.value)}
          >
            {VISION_MODEL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <SlidersHorizontal className="h-4 w-4 text-ink/50" aria-hidden="true" />
            返回标签数量
          </span>
          <div className="flex h-11 items-center gap-3 rounded-md border border-line bg-paper/40 px-3">
            <input
              className="w-full accent-cobalt"
              type="range"
              min={isLocalTools ? 0 : 1}
              max={8}
              step={1}
              value={config.topK}
              disabled={disabled || isLocalTools}
              onChange={(event) =>
                onChange({
                  ...config,
                  topK: Number(event.target.value),
                })
              }
            />
            <span className="w-6 text-right text-sm font-semibold tabular-nums text-ink">
              {config.topK}
            </span>
          </div>
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
        <div className="rounded-md border border-line bg-paper/40 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">当前任务</p>
          <p className="mt-1 text-sm font-medium text-ink">{config.task}</p>
          <p className="mt-1 break-all text-xs text-ink/60">{config.model}</p>
        </div>

        <div className="rounded-md border border-line bg-paper/40 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">运行位置</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {isLocalTools ? "浏览器本地工具" : isGemini ? "Gemini API 云端分析" : "浏览器本地推理"}
          </p>
          <p className="mt-1 text-xs text-ink/60">
            {isLocalTools ? "不等待模型下载" : isGemini ? "需要 API Key，支持高维结构化输出" : "无需后端与 API Key"}
          </p>
        </div>
      </div>

      {isGemini ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3">
            <div className="flex items-start gap-2 text-sm text-coral">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                纯前端直连 Gemini 会让 API Key 出现在浏览器网络请求中；MVP 可用，正式产品建议改成后端或 Serverless 代理。
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <KeyRound className="h-4 w-4 text-ink/50" aria-hidden="true" />
                Gemini API Key
              </span>
              <input
                className="h-11 w-full rounded-md border border-line bg-paper/60 px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper/40"
                type="password"
                placeholder="AIza..."
                value={config.apiKey}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...config,
                    apiKey: event.target.value,
                  })
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-ink">Key 保存方式</span>
              <select
                className="h-11 w-full rounded-md border border-line bg-paper/60 px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper/40"
                value={config.apiKeyStorage}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...config,
                    apiKeyStorage: event.target.value as "session" | "local",
                  })
                }
              >
                <option value="session">仅本次页面会话</option>
                <option value="local">保存到本机浏览器</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <Cpu className="h-4 w-4 text-ink/50" aria-hidden="true" />
                Gemini 模型 ID
              </span>
              <input
                className="h-11 w-full rounded-md border border-line bg-paper/60 px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper/40"
                value={config.model}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...config,
                    model: event.target.value,
                  })
                }
              />
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <Thermometer className="h-4 w-4 text-ink/50" aria-hidden="true" />
                温度
              </span>
              <div className="flex h-11 items-center gap-3 rounded-md border border-line bg-paper/40 px-3">
                <input
                  className="w-full accent-cobalt"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.temperature}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...config,
                      temperature: Number(event.target.value),
                    })
                  }
                />
                <span className="w-8 text-right text-sm font-semibold tabular-nums text-ink">
                  {config.temperature.toFixed(1)}
                </span>
              </div>
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-line px-3 py-3">
            <input
              className="h-4 w-4 accent-cobalt"
              type="checkbox"
              checked={config.responseJson}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...config,
                  responseJson: event.target.checked,
                })
              }
            />
            <span className="text-sm font-medium text-ink">要求 Gemini 输出结构化 JSON</span>
          </label>
        </div>
      ) : null}

      {isZeroShot ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <ListChecks className="h-4 w-4 text-ink/50" aria-hidden="true" />
              候选标签
            </span>
            <textarea
              className="min-h-32 w-full resize-y rounded-md border border-line bg-paper/60 px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper/40"
              value={config.candidateLabels.join("\n")}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...config,
                  candidateLabels: parseCandidateLabels(event.target.value),
                })
              }
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink">Prompt 模板</span>
            <input
              className="h-11 w-full rounded-md border border-line bg-paper/60 px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper/40"
              value={config.hypothesisTemplate}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...config,
                  hypothesisTemplate: event.target.value,
                })
              }
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
