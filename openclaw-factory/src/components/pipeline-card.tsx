import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EnrichedPipeline } from "@/hooks/use-pipelines";

function statusVariant(stage: string, hasGate: boolean) {
  if (stage === "done") return "done" as const;
  if (stage === "blocked") return "failed" as const;
  if (hasGate) return "waiting" as const;
  return "running" as const;
}

function statusColor(stage: string, hasGate: boolean): string {
  if (stage === "done") return "bg-emerald-500";
  if (stage === "blocked") return "bg-red-500";
  if (hasGate) return "bg-amber-500";
  return "bg-sky-500";
}

interface PipelineCardProps {
  pipeline: EnrichedPipeline;
}

export function PipelineCard({ pipeline: p }: PipelineCardProps) {
  const navigate = useNavigate();
  const variant = statusVariant(p.stage, p.has_pending_gate);

  return (
    <Card
      className="cursor-pointer hover:bg-surface-container"
      onClick={() => navigate(`/pipeline/${p.task_id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusColor(p.stage, p.has_pending_gate))} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-surface">
              {p.title || p.task_id}
            </p>
            <p className="font-mono text-[11px] text-on-surface-variant">{p.task_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={variant}>{p.stage_label}</Badge>
          {p.elapsed_display && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant tabular-nums">
              <Clock className="h-3 w-3" />
              {p.elapsed_display}
            </span>
          )}
        </div>
      </div>

      {/* Stage dots */}
      <div className="mt-3 flex items-center gap-1.5">
        {p.stages.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                s.status === "done" && "bg-emerald-500",
                s.status === "active" && "bg-primary",
                s.status === "failed" && "bg-red-500",
                s.status === "pending" && "bg-on-surface-variant/30"
              )}
            />
          </div>
        ))}
        <span className="ml-auto text-[10px] text-on-surface-variant">
          {p.stages.filter((s) => s.status === "done").length}/{p.stages.length}
        </span>
      </div>
    </Card>
  );
}
