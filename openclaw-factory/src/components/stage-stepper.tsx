import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  name: string;
  label: string;
  status: string;
}

interface StageStepperProps {
  stages: Stage[];
}

function NodeIcon({ status, index }: { status: string; index: number }) {
  if (status === "done") return <Check className="h-3 w-3" />;
  if (status === "failed") return <X className="h-3 w-3" />;
  return <span className="text-[11px] font-medium">{index + 1}</span>;
}

export function StageStepper({ stages }: StageStepperProps) {
  return (
    <div className="flex items-center gap-0">
      {stages.map((stage, i) => (
        <div key={stage.name} className="flex items-center">
          {i > 0 && (
            <div
              className={cn(
                "h-px w-8 transition-colors duration-200",
                stages[i - 1].status === "done" ? "bg-text-tertiary" : "bg-border"
              )}
            />
          )}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] text-xs font-medium transition-all duration-200",
                stage.status === "done" &&
                  "border-text-tertiary bg-transparent text-text-secondary",
                stage.status === "active" &&
                  "border-text-primary bg-text-primary text-page",
                stage.status === "failed" &&
                  "border-status-failed bg-transparent text-status-failed",
                stage.status === "pending" &&
                  "border-border bg-page text-text-tertiary"
              )}
            >
              <NodeIcon status={stage.status} index={i} />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium",
                stage.status === "active"
                  ? "text-text-primary"
                  : stage.status === "failed"
                  ? "text-status-failed"
                  : "text-text-secondary"
              )}
            >
              {stage.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
