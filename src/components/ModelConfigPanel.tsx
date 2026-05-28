import {
  BrainCircuit,
  Cpu,
  KeyRound,
  ListChecks,
  ShieldAlert,
  SlidersHorizontal,
  Thermometer,
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

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cobalt/10 text-cobalt">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 className="font-semibold text-ink">模型配置</h2>
            <p className="text-sm leading-6 text-ink/62">{selectedPreset.description}</p>
          </div>
        </div>
        <span className="w-fit rounded-md bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
          {selectedPreset.provider}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <Cpu className="h-4 w-4 text-ink/50" aria-hidden="true" />
            模型
          </span>
          <select
            className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper"
            value={config.presetId}
            disabled={disabled}
            onChange={(event) => {
              const nextConfig = createConfigFromPreset(event.target.value);
              onChange({
                ...nextConfig,
                apiKey: config.apiKey,
              });
            }}
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
          <div className="flex h-11 items-center gap-3 rounded-md border border-line px-3">
            <input
              className="w-full accent-cobalt"
              type="range"
              min={1}
              max={8}
              step={1}
              value={config.topK}
              disabled={disabled}
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
        <div className="rounded-md bg-paper px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">当前任务</p>
          <p className="mt-1 text-sm font-medium text-ink">{config.task}</p>
          <p className="mt-1 break-all text-xs text-ink/55">{config.model}</p>
        </div>

        <div className="rounded-md bg-paper px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">运行位置</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {isGemini ? "Gemini API 云端分析" : "浏览器本地推理"}
          </p>
          <p className="mt-1 text-xs text-ink/55">
            {isGemini ? "需要 API Key，支持高维结构化输出" : "无需后端与 API Key"}
          </p>
        </div>
      </div>

      {isGemini ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-coral/20 bg-coral/10 px-4 py-3">
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
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper"
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
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper"
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
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper"
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
              <div className="flex h-11 items-center gap-3 rounded-md border border-line px-3">
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
              className="min-h-32 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper"
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
              className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:cursor-not-allowed disabled:bg-paper"
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
