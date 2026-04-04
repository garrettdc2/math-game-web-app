import { Check, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  name: string;
  label: string;
  status: string;
}

interface StageStepperProps {
  stages: Stage[];
}

function NodeIcon({ status }: { status: string }) {
  if (status === "done") return <Check className="h-4 w-4" />;
  if (status === "failed") return <X className="h-4 w-4" />;
  if (status === "active") return <Circle className="h-3 w-3 fill-current" />;
  return <Circle className="h-3 w-3" />;
}

export function StageStepper({ stages }: StageStepperProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {stages.map((stage, i) => (
        <div key={stage.name} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                stage.status === "done" &&
                  "bg-transparent border-2 border-primary text-primary",
                stage.status === "active" &&
                  "bg-primary text-on-primary",
                stage.status === "failed" &&
                  "bg-transparent border-2 border-error text-error",
                stage.status === "pending" &&
                  "bg-transparent border-2 border-outline-ghost text-on-surface-variant"
              )}
            >
              <NodeIcon status={stage.status} />
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                stage.status === "active"
                  ? "text-on-surface"
                  : stage.status === "failed"
                  ? "text-error"
                  : "text-on-surface-variant"
              )}
            >
              {stage.label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div
              className={cn(
                "h-0.5 flex-1 mx-3 transition-colors duration-200",
                stages[i].status === "done" ? "bg-primary" : "bg-outline-ghost"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
