import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EnrichedPipeline } from "@/hooks/use-pipelines";

function statusVariant(stage: string, hasGate: boolean) {
  if (stage === "done") return "done" as const;
  if (stage === "blocked") return "failed" as const;
  if (hasGate) return "waiting" as const;
  return "running" as const;
}

interface PipelineTableProps {
  pipelines: EnrichedPipeline[];
}

export function PipelineTable({ pipelines }: PipelineTableProps) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-ghost">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
              Pipeline ID
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
              Title / Description
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
              Current State
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {pipelines.map((p, idx) => (
            <tr
              key={p.task_id}
              className={`cursor-pointer transition-colors hover:bg-surface-container ${
                idx !== pipelines.length - 1 ? "border-b border-outline-ghost" : ""
              }`}
              onClick={() => navigate(`/pipeline/${p.task_id}`)}
            >
              <td className="px-4 py-3">
                <span className="font-mono text-sm text-on-surface-variant">
                  {p.task_id}
                </span>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {p.title || p.task_id}
                  </p>
                  {p.title && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {p.stages.filter((s) => s.status === "done").length} of {p.stages.length} stages complete
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(p.stage, p.has_pending_gate)}>
                  {p.badge_label}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pipeline/${p.task_id}`);
                  }}
                >
                  Quick View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pipelines.length > 0 && (
        <div className="px-4 py-3 border-t border-outline-ghost">
          <button
            className="text-sm text-primary hover:text-primary-dim transition-colors cursor-pointer"
            onClick={() => navigate("/pipelines")}
          >
            View all {pipelines.length} pipelines →
          </button>
        </div>
      )}
    </Card>
  );
}
