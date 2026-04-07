import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HealthItem {
  name: string;
  status: "healthy" | "degraded" | "offline";
  detail?: string;
}

interface SystemHealthProps {
  items?: HealthItem[];
}

const DEFAULT_ITEMS: HealthItem[] = [
  { name: "API Gateway", status: "healthy" },
  { name: "Worker Nodes", status: "healthy", detail: "Active (12)" },
  { name: "DB Replication", status: "degraded", detail: "Delayed" },
];

function StatusDot({ status }: { status: HealthItem["status"] }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        status === "healthy" && "bg-emerald-500",
        status === "degraded" && "bg-amber-500",
        status === "offline" && "bg-red-500"
      )}
    />
  );
}

export function SystemHealth({ items = DEFAULT_ITEMS }: SystemHealthProps) {
  return (
    <Card className="p-5 h-full">
      <h3 className="text-sm font-semibold text-on-surface mb-4">System Health</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot status={item.status} />
              <span className="text-sm text-on-surface">{item.name}</span>
            </div>
            {item.detail && (
              <span
                className={cn(
                  "text-xs",
                  item.status === "healthy" && "text-emerald-600",
                  item.status === "degraded" && "text-amber-600",
                  item.status === "offline" && "text-red-600"
                )}
              >
                {item.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
