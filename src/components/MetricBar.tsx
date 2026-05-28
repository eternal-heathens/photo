import { clampScore } from "../lib/utils";

type MetricBarProps = {
  label: string;
  score: number;
};

export function MetricBar({ label, score }: MetricBarProps) {
  const safeScore = clampScore(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-ink/70">{safeScore}</span>
      </div>
      <div className="h-2 rounded-full bg-ink/10">
        <div
          className="h-2 rounded-full bg-cobalt"
          style={{ width: `${safeScore}%` }}
          aria-label={`${label} ${safeScore} 分`}
        />
      </div>
    </div>
  );
}
