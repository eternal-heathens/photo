import {
  Aperture,
  BrainCircuit,
  Camera,
  Download,
  FileJson,
  Palette,
  SlidersHorizontal,
  SunMedium,
  Tags,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AnalysisDimension, PhotoAnalysisResult } from "../types/photo";
import { findGlossaryEntry } from "../lib/photographyGlossary";
import { downloadJson } from "../lib/utils";
import { MetricBar } from "./MetricBar";
import { RichTextWithTerms } from "./TermBubble";

type AnalysisResultCardProps = {
  result: PhotoAnalysisResult;
};

type DimensionBlockProps = {
  title: string;
  icon: ReactNode;
  dimension: AnalysisDimension;
};

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-paper px-3 py-2 text-sm leading-5 text-ink/78">
            <RichTextWithTerms text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DimensionBlock({ title, icon, dimension }: DimensionBlockProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cobalt/10 text-cobalt">
            {icon}
          </span>
          <h3 className="font-semibold text-ink">{title}</h3>
        </div>
        <span className="rounded-md bg-ink px-2 py-1 text-sm font-semibold tabular-nums text-white">
          {dimension.score}
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <BulletList title="优点" items={dimension.strengths} />
        <BulletList title="问题" items={dimension.issues} />
        <BulletList title="建议" items={dimension.suggestions} />
      </div>
    </section>
  );
}

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
  const json = JSON.stringify(result, null, 2);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
        <div className="bg-ink">
          <img
            className="h-full min-h-[320px] w-full object-cover"
            src={result.previewUrl}
            alt={result.fileName}
          />
        </div>
        <div className="space-y-6 p-5 lg:p-6">
          <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
                  {result.sceneType}
                </span>
                <span className="rounded-md bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                  结构化结果
                </span>
              </div>
              <h2 className="truncate text-xl font-semibold text-ink">{result.fileName}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">
                  综合评分
                </p>
                <p className="text-4xl font-semibold tabular-nums text-ink">{result.overallScore}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink/70 transition hover:border-cobalt hover:bg-cobalt/10 hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2"
                aria-label="下载 JSON"
                title="下载 JSON"
                onClick={() => downloadJson(result.fileName, result)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricBar label="构图" score={result.analysis.composition.score} />
            <MetricBar label="光影" score={result.analysis.lighting.score} />
            <MetricBar label="色彩" score={result.analysis.color.score} />
          </section>

          <div className="space-y-4">
            <DimensionBlock
              title="构图分析"
              icon={<Aperture className="h-4 w-4" aria-hidden="true" />}
              dimension={result.analysis.composition}
            />
            <DimensionBlock
              title="光影分析"
              icon={<SunMedium className="h-4 w-4" aria-hidden="true" />}
              dimension={result.analysis.lighting}
            />
            <DimensionBlock
              title="色彩分析"
              icon={<Palette className="h-4 w-4" aria-hidden="true" />}
              dimension={result.analysis.color}
            />
          </div>

          <section className="rounded-lg border border-line bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal/10 text-teal">
                <Tags className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-ink">技巧标签</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.analysis.techniques.map((technique) => (
                <span
                  key={technique}
                  className="rounded-md border border-teal/20 bg-teal/10 px-2.5 py-1 text-sm font-medium text-teal"
                >
                  {findGlossaryEntry(technique) ? (
                    <RichTextWithTerms text={technique} />
                  ) : (
                    technique
                  )}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cobalt/10 text-cobalt">
                  <BrainCircuit className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">AI 图片识别</h3>
                  <p className="text-xs text-ink/55">
                    {result.vision.config.task} · top {result.vision.config.topK}
                  </p>
                </div>
              </div>
              <span
                className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${
                  result.vision.status === "real"
                    ? "bg-teal/10 text-teal"
                    : "bg-coral/10 text-coral"
                }`}
              >
                {result.vision.status === "real" ? "真实模型" : "已回退"}
              </span>
            </div>
            <p className="mb-3 break-all rounded-md bg-paper px-3 py-2 text-xs text-ink/60">
              {result.vision.model}
            </p>
            {result.vision.labels.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {result.vision.labels.map((label) => (
                  <div key={label.label} className="rounded-md bg-paper px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink">{label.label}</span>
                      <span className="shrink-0 tabular-nums text-ink/60">
                        {Math.round(label.score * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/68">
                模型未返回识别标签，当前结果使用结构化规则回退生成。
              </p>
            )}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-coral/10 text-coral">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="font-semibold text-ink">拍摄优化建议</h3>
              </div>
              <BulletList title="执行项" items={result.recommendations.shooting} />
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-moss/10 text-moss">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="font-semibold text-ink">后期处理建议</h3>
              </div>
              <BulletList title="执行项" items={result.recommendations.postProcessing} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-ink p-4 text-white">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-white/70" aria-hidden="true" />
                <h3 className="font-semibold">原始 JSON</h3>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-paper focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ink"
                onClick={() => downloadJson(result.fileName, result)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                下载
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-md bg-black/25 p-3 text-xs leading-5 text-white/85">
              {json}
            </pre>
          </section>
        </div>
      </div>
    </article>
  );
}
