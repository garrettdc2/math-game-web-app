import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  subtitle?: string;
  progress?: number; // 0-100
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}

export function MetricCard({ label, value, unit, icon: Icon, subtitle, progress, trend }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-on-surface-variant">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-5xl font-semibold tracking-tight text-on-surface tabular-nums">
              {value}
            </p>
            {unit && (
              <span className="text-lg text-on-surface-variant">{unit}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-surface-container">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trend.direction === "up" ? (
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              trend.direction === "up" ? "text-emerald-600" : "text-red-600"
            )}
          >
            +{trend.value}% from previous cycle
          </span>
        </div>
      )}
    </Card>
  );
}
