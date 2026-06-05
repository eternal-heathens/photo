import {
  AlertTriangle,
  Aperture,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Download,
  FileJson,
  Gauge,
  Info,
  Palette,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium,
  Tags,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type {
  AnalysisIssue,
  CompareOperation,
  DimensionInsight,
  IssueSeverity,
  PhotoComparePlan,
  PhotoAnalysisV2Result,
  Recommendation,
  RecommendationCategory,
} from "../types/analysisV2";
import { downloadJson } from "../lib/utils";
import {
  downloadRenderedCompareDetailImage,
  downloadRenderedCompareImage,
  renderCompareImage,
  type RenderedCompareDetail,
  type RenderedCompareImage,
} from "../lib/compareImageRenderer";
import { compareOperationLabels, getTechniqueNames } from "../lib/photoTechniqueKnowledge";
import { MetricBar } from "./MetricBar";
import { RichTextWithTerms } from "./TermBubble";

type AnalysisResultCardProps = {
  result: PhotoAnalysisV2Result;
};

const dimensionIcons: Record<string, ReactNode> = {
  composition: <Aperture className="h-4 w-4" aria-hidden="true" />,
  lighting: <SunMedium className="h-4 w-4" aria-hidden="true" />,
  color: <Palette className="h-4 w-4" aria-hidden="true" />,
  technical: <Gauge className="h-4 w-4" aria-hidden="true" />,
  story: <Tags className="h-4 w-4" aria-hidden="true" />,
};

const severityLabels: Record<IssueSeverity, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

const categoryLabels: Record<RecommendationCategory, string> = {
  shooting: "拍摄",
  postProcessing: "后期",
  composition: "构图",
  publishing: "发布",
};

const compareIcons: Record<CompareOperation, ReactNode> = {
  crop: <Scissors className="h-4 w-4" aria-hidden="true" />,
  tone: <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />,
  color: <Palette className="h-4 w-4" aria-hidden="true" />,
  geometry: <Aperture className="h-4 w-4" aria-hidden="true" />,
  background: <Tags className="h-4 w-4" aria-hidden="true" />,
  annotation: <Info className="h-4 w-4" aria-hidden="true" />,
  "parameter-card": <Gauge className="h-4 w-4" aria-hidden="true" />,
};

function severityClass(severity: IssueSeverity) {
  if (severity === "high") return "border-coral/25 bg-coral/10 text-coral";
  if (severity === "medium") return "border-moss/25 bg-moss/10 text-moss";
  return "border-cobalt/20 bg-cobalt/10 text-cobalt";
}

function SectionTitle({ icon, title, caption }: { icon: ReactNode; title: string; caption?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cream text-dark-ink">
        {icon}
      </span>
      <div>
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        {caption ? <p className="text-xs leading-5 text-ink/60">{caption}</p> : null}
      </div>
    </div>
  );
}

function TextList({ items }: { items: string[] }) {
  if (!items.length) {
    return (
      <p className="rounded-md border border-line bg-paper/40 px-3 py-2 text-sm text-ink/60">
        暂无专项内容。
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-md border border-line bg-paper/40 px-3 py-2 text-sm leading-5 text-ink/80">
          <RichTextWithTerms text={item} />
        </li>
      ))}
    </ul>
  );
}

function IssueList({ issues }: { issues: AnalysisIssue[] }) {
  if (!issues.length) {
    return (
      <p className="rounded-md border border-line bg-paper/40 px-3 py-2 text-sm text-ink/60">
        当前维度没有识别到明显高风险问题。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <article key={issue.id} className="rounded-md border border-line bg-paper/40 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${severityClass(issue.severity)}`}>
              {severityLabels[issue.severity]}
            </span>
            <h4 className="text-sm font-semibold text-ink">{issue.title}</h4>
          </div>
          <TextList items={[...issue.evidence, ...issue.suggestions].slice(0, 4)} />
        </article>
      ))}
    </div>
  );
}

function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations.length) {
    return (
      <p className="rounded-md border border-line bg-paper/40 px-3 py-2 text-sm text-ink/60">
        当前维度暂未生成专项建议。
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {recommendations.map((recommendation) => (
        <article key={recommendation.id} className="rounded-md border border-line bg-paper/40 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">
              {categoryLabels[recommendation.category]}
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${severityClass(recommendation.priority)}`}>
              {severityLabels[recommendation.priority]}
            </span>
          </div>
          <h4 className="mb-2 text-sm font-semibold text-ink">{recommendation.title}</h4>
          <TextList items={[...recommendation.steps, recommendation.expectedEffect]} />
        </article>
      ))}
    </div>
  );
}

function aspectRatioValue(value?: string) {
  if (!value) return undefined;
  return value.replace("/", " / ");
}

function CompareImageLightbox({
  image,
  title,
  onClose,
  onDownload,
}: {
  image: RenderedCompareDetail;
  title: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-5"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-soft"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-forest-alt px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{title}</p>
            <p className="text-xs text-ink/55">
              {image.width} x {image.height}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-paper/80 px-3 text-xs font-semibold text-ink/70 transition hover:border-cobalt hover:bg-cobalt/10 hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper"
              onClick={onDownload}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              下载
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-paper/80 text-ink/70 transition hover:border-coral hover:bg-coral/10 hover:text-coral focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-paper"
              aria-label="关闭放大预览"
              title="关闭"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(92vh-68px)] overflow-auto bg-ink/5 p-3 sm:p-5">
          <img
            className="mx-auto max-h-[calc(92vh-116px)] max-w-full object-contain"
            src={image.dataUrl}
            alt={title}
          />
        </div>
      </div>
    </div>
  );
}

function ComparePreview({ result, plan }: { result: PhotoAnalysisV2Result; plan: PhotoComparePlan }) {
  const isCrop = plan.operation === "crop";
  const isParameterCard = plan.operation === "parameter-card";
  const aspectRatio = aspectRatioValue(plan.preview.aspectRatio);
  const [renderedImage, setRenderedImage] = useState<RenderedCompareImage | null>(null);
  const [renderError, setRenderError] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [zoomTarget, setZoomTarget] = useState<RenderedCompareDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    setRenderedImage(null);
    setRenderError("");
    setIsRendering(true);
    setZoomTarget(null);

    renderCompareImage(result.previewUrl, result.fileName, plan)
      .then((image) => {
        if (cancelled) return;
        setRenderedImage(image);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRenderError(error instanceof Error ? error.message : "对比图生成失败。");
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan, result.fileName, result.previewUrl]);

  useEffect(() => {
    if (!zoomTarget) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomTarget(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomTarget]);

  const handleDownloadCompareImage = () => {
    if (renderedImage) downloadRenderedCompareImage(renderedImage);
  };

  const handleDownloadZoomTarget = () => {
    if (renderedImage && zoomTarget) downloadRenderedCompareDetailImage(renderedImage, zoomTarget);
  };

  const renderedImageBlock = (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-ink/60">
          {isRendering ? "正在生成 Canvas 对比图..." : renderedImage ? "左右缩略图已生成，可分别放大" : "使用轻量预览"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!renderedImage}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-line bg-paper/70 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-cobalt hover:bg-cobalt/10 hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-45"
            onClick={handleDownloadCompareImage}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            下载对比图
          </button>
        </div>
      </div>
      {renderedImage ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {[renderedImage.before, renderedImage.after].map((detail) => {
              const label = detail.kind === "before" ? "原图" : "建议图";
              const accentClass = detail.kind === "before" ? "bg-ink" : "bg-cobalt";

              return (
                <figure key={detail.kind} className="space-y-2">
                  <button
                    type="button"
                    className="group relative block w-full overflow-hidden rounded-md border border-cobalt/20 bg-paper/70 text-left transition hover:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper"
                    aria-label={`放大查看 ${label}`}
                    onClick={() => setZoomTarget(detail)}
                  >
                    <div className="flex h-44 items-center justify-center bg-cream/60 p-2 sm:h-56">
                      <img
                        className="max-h-full max-w-full object-contain"
                        src={detail.dataUrl}
                        alt={`${result.fileName} ${label}缩略图`}
                      />
                    </div>
                    <span className={`absolute left-2 top-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-paper ${accentClass}`}>
                      {label}
                    </span>
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md bg-cobalt px-2.5 py-1.5 text-xs font-semibold text-paper opacity-95 transition group-hover:bg-cobalt/90">
                      <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                      放大{label}
                    </span>
                  </button>
                  <figcaption className="text-xs font-medium text-ink/60">
                    点击可单独放大{label}
                  </figcaption>
                </figure>
              );
            })}
          </div>
          {zoomTarget ? (
            <CompareImageLightbox
              image={zoomTarget}
              title={`${result.fileName} · ${zoomTarget.title}`}
              onClose={() => setZoomTarget(null)}
              onDownload={handleDownloadZoomTarget}
            />
          ) : null}
        </>
      ) : renderError ? (
        <p className="rounded-md border border-coral/20 bg-coral/10 px-3 py-2 text-sm text-coral">
          {renderError}
        </p>
      ) : null}
    </div>
  );

  if (isParameterCard) {
    return (
      <div className="space-y-3">
        {renderedImageBlock}
        {!renderedImage ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.preview.parameters?.map((item) => (
              <div key={`${plan.id}-${item.label}`} className="rounded-md border border-line bg-paper/40 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderedImageBlock}
      {!renderedImage ? (
        <div className="grid gap-3 md:grid-cols-2">
          <figure className="space-y-2">
            <div className="overflow-hidden rounded-md border border-line bg-paper/40" style={aspectRatio ? { aspectRatio } : undefined}>
              <img className="h-full w-full object-cover" src={result.previewUrl} alt={`${result.fileName} 原图`} />
            </div>
            <figcaption className="text-xs font-medium text-ink/60">原图</figcaption>
          </figure>
          <figure className="space-y-2">
            <div className="relative overflow-hidden rounded-md border border-cobalt/30 bg-cobalt/5" style={aspectRatio ? { aspectRatio } : undefined}>
              <img
                className="h-full w-full object-cover"
                src={result.previewUrl}
                alt={`${result.fileName} 建议预览`}
                style={{ filter: plan.preview.cssFilter ?? "none" }}
              />
              {isCrop ? (
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <span key={index} className="border border-white/55" />
                  ))}
                </div>
              ) : null}
              {plan.preview.overlayLabels?.length ? (
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
                  {plan.preview.overlayLabels.slice(0, 3).map((label) => (
                    <span key={label} className="rounded-md bg-cream/90 px-2 py-1 text-xs font-semibold text-dark-ink">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <figcaption className="text-xs font-medium text-cobalt">建议预览</figcaption>
          </figure>
        </div>
      ) : null}
    </div>
  );
}

function ComparePlanPanel({ result }: { result: PhotoAnalysisV2Result }) {
  if (!result.comparePlans?.length) return null;

  return (
    <section className="rounded-lg border border-line bg-paper/40 p-4">
      <SectionTitle
        icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
        title="建议对比图方案"
        caption="先给出可解释、低风险的预览计划；严重失焦或不可恢复高光不会伪造成修复结果。"
      />
      <div className="space-y-4">
        {result.comparePlans.map((plan) => (
          <article key={plan.id} className="rounded-md border border-line bg-forest-alt/75 p-3">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-cobalt/10 px-2 py-1 text-xs font-semibold text-cobalt">
                    {compareIcons[plan.operation]}
                    {compareOperationLabels[plan.operation]}
                  </span>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${severityClass(plan.priority)}`}>
                    {severityLabels[plan.priority]}
                  </span>
                  <span className="rounded-md bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">
                    置信度 {plan.confidence}
                  </span>
                </div>
                <h4 className="font-semibold text-ink">{plan.title}</h4>
                <p className="text-sm leading-6 text-ink/70">{plan.summary}</p>
              </div>
              <div className="shrink-0 rounded-md border border-line bg-paper/40 px-3 py-2 text-xs text-ink/60">
                强度：{plan.strength === "conservative" ? "保守" : plan.strength === "standard" ? "标准" : "明显"}
              </div>
            </div>

            <ComparePreview result={result} plan={plan} />

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">依据</p>
                <TextList items={plan.evidence.length ? plan.evidence : ["当前方案来自规则引擎和摄影技巧知识库。"]} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">拍摄侧</p>
                <TextList items={plan.shootingAdvice.slice(0, 3)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">后期侧</p>
                <TextList items={plan.postAdvice.slice(0, 3)} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {getTechniqueNames(plan.techniqueIds).map((name) => (
                <span key={`${plan.id}-${name}`} className="rounded-md bg-cobalt/10 px-2 py-1 font-semibold text-cobalt">
                  {name}
                </span>
              ))}
              {plan.safetyNotes.map((note) => (
                <span key={`${plan.id}-${note}`} className="rounded-md bg-coral/10 px-2 py-1 font-semibold text-coral">
                  {note}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DimensionPanel({ dimension }: { dimension: DimensionInsight }) {
  return (
    <section className="rounded-lg border border-line bg-forest-alt/75 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionTitle
          icon={dimensionIcons[dimension.key] ?? <Info className="h-4 w-4" aria-hidden="true" />}
          title={dimension.title}
          caption={`置信度 ${dimension.confidence}`}
        />
        <span className="w-fit rounded-md bg-cream px-2.5 py-1 text-sm font-semibold tabular-nums text-dark-ink">
          {dimension.score}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">当前情况</h4>
          <TextList items={dimension.currentState} />
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">存在问题</h4>
          <IssueList issues={dimension.issues} />
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">如何改进</h4>
          <TextList items={dimension.recommendations.flatMap((item) => item.steps).slice(0, 4)} />
        </div>
      </div>

      {dimension.strengths.length ? (
        <div className="mt-4 rounded-md bg-teal/10 px-3 py-2 text-sm leading-6 text-teal">
          <RichTextWithTerms text={dimension.strengths.join(" ")} />
        </div>
      ) : null}
    </section>
  );
}

function ToolSignalPanel({ result }: { result: PhotoAnalysisV2Result }) {
  const { vision, cv, exif, advanced } = result.signals;

  return (
    <section className="rounded-lg border border-line bg-forest-alt/75 p-4">
      <SectionTitle
        icon={<BrainCircuit className="h-4 w-4" aria-hidden="true" />}
        title="工具信号"
        caption="每个结论都尽量追溯到模型标签、CV 指标、EXIF 或规则。"
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-line bg-paper/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">视觉模型</p>
          <p className="mt-1 break-all text-sm font-medium text-ink">{vision?.model ?? "未启用"}</p>
          <p className="mt-1 text-xs text-ink/60">
            {vision ? `${vision.provider} · ${vision.status === "real" ? "真实结果" : "已回退"}` : "无标签信号"}
          </p>
          {vision?.labels.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vision.labels.slice(0, 6).map((label) => (
                <span key={label.label} className="rounded-md bg-cream px-2 py-1 text-xs font-medium text-dark-ink">
                  {label.label} {Math.round(label.score * 100)}%
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-line bg-paper/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">CV 指标</p>
          {cv ? (
            <div className="mt-2 space-y-2">
              <MetricBar label="曝光均值" score={cv.exposure.meanLuma * 100} />
              <MetricBar label="清晰度" score={cv.sharpness.laplacianVarianceProxy * 100} />
              <MetricBar label="色彩协调" score={cv.color.colorHarmonyProxy * 100} />
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink/60">未生成 CV 指标。</p>
          )}
        </div>

        <div className="rounded-md border border-line bg-paper/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">EXIF</p>
          {exif && (exif.cameraModel || exif.iso || exif.aperture || exif.shutterSpeed) ? (
            <dl className="mt-2 space-y-1 text-sm text-ink/70">
              <div className="flex justify-between gap-3">
                <dt>设备</dt>
                <dd className="text-right">{exif.cameraModel ?? exif.cameraMake ?? "未知"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>参数</dt>
                <dd className="text-right">
                  ISO {exif.iso ?? "?"} · f/{exif.aperture ?? "?"} · {exif.shutterSpeed ?? "?"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>焦距</dt>
                <dd className="text-right">{exif.focalLengthMm ? `${exif.focalLengthMm}mm` : "未知"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-sm text-ink/60">未读取到可用拍摄参数。</p>
          )}
        </div>
      </div>

      {advanced ? (
        <div className="mt-3 rounded-md border border-cobalt/20 bg-cobalt/10 px-3 py-2 text-sm leading-6 text-cobalt">
          {advanced.summary}
        </div>
      ) : null}

      {result.warnings.length ? (
        <div className="mt-3 rounded-md border border-coral/20 bg-coral/10 px-3 py-2 text-sm leading-6 text-coral">
          {result.warnings.join(" ")}
        </div>
      ) : null}
    </section>
  );
}

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
  const json = JSON.stringify(result, null, 2);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-forest-alt/80">
      <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
        <div className="bg-paper/60">
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
                  {result.scene.sceneType}
                </span>
                <span className="rounded-md bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                  {result.mode === "advanced" ? "高级增强" : "基础分析"}
                </span>
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  result.status === "completed" ? "bg-cobalt/10 text-cobalt" : "bg-coral/10 text-coral"
                }`}>
                  {result.status === "completed" ? "完整结果" : result.status === "partial" ? "部分降级" : "失败"}
                </span>
              </div>
              <h2 className="truncate text-xl font-semibold text-ink">{result.fileName}</h2>
              <p className="text-xs text-ink/60">
                结果不包含 API Key 和原图；GPS 默认脱敏：{result.exportPolicy.gpsRemoved ? "是" : "否"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">综合评分</p>
                <p className="text-4xl font-semibold tabular-nums text-ink">{result.scores.overall}</p>
                <p className="text-xs text-ink/60">置信度 {result.scores.confidence}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink/70 transition hover:border-cobalt hover:bg-cobalt/10 hover:text-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper"
                aria-label="下载 JSON"
                title="下载 JSON"
                onClick={() => downloadJson(result.fileName, result)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          {result.dimensions.length ? (
            <section className="grid gap-4 md:grid-cols-5">
              {result.dimensions.map((dimension) => (
                <MetricBar key={dimension.key} label={dimension.title} score={dimension.score} />
              ))}
            </section>
          ) : null}

          <section className="rounded-lg border border-line bg-paper/40 p-4">
            <SectionTitle
              icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
              title="优先问题"
              caption="先处理高优先级，再处理风格和发布层面的优化。"
            />
            <IssueList issues={result.topIssues} />
          </section>

          <section className="rounded-lg border border-line bg-paper/40 p-4">
            <SectionTitle
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              title="优化建议"
              caption="建议拆成可执行步骤，不自动改图。"
            />
            <RecommendationList recommendations={result.recommendations} />
          </section>

          <ComparePlanPanel result={result} />

          <div className="space-y-4">
            {result.dimensions.map((dimension) => (
              <DimensionPanel key={dimension.key} dimension={dimension} />
            ))}
          </div>

          <ToolSignalPanel result={result} />

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-line bg-paper/40 p-4">
              <SectionTitle
                icon={<Camera className="h-4 w-4" aria-hidden="true" />}
                title="拍摄侧关注"
              />
              <TextList
                items={result.recommendations
                  .filter((item) => item.category === "shooting" || item.category === "composition")
                  .flatMap((item) => item.steps)
                  .slice(0, 5)}
              />
            </div>
            <div className="rounded-lg border border-line bg-paper/40 p-4">
              <SectionTitle
                icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
                title="后期侧关注"
              />
              <TextList
                items={result.recommendations
                  .filter((item) => item.category === "postProcessing")
                  .flatMap((item) => item.steps)
                  .slice(0, 5)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-paper/40 p-4">
            <SectionTitle
              icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              title="导出策略"
              caption="下载 JSON 会再次移除 API Key 和 File 对象。"
            />
            <div className="grid gap-2 text-sm text-ink/70 sm:grid-cols-3">
              <span className="rounded-md border border-line bg-paper/40 px-3 py-2">不含 API Key</span>
              <span className="rounded-md border border-line bg-paper/40 px-3 py-2">不含原图 base64</span>
              <span className="rounded-md border border-line bg-paper/40 px-3 py-2">
                GPS {result.exportPolicy.gpsRemoved ? "已脱敏" : "未脱敏"}
              </span>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-paper/60 p-4 text-ink">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-ink/70" aria-hidden="true" />
                <h3 className="font-semibold">原始 JSON</h3>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-cream px-3 py-1.5 text-sm font-semibold text-dark-ink transition hover:bg-cream-alt focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper"
                onClick={() => downloadJson(result.fileName, result)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                下载
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-md bg-black/25 p-3 text-xs leading-5 text-ink/80">
              {json}
            </pre>
          </section>
        </div>
      </div>
    </article>
  );
}
