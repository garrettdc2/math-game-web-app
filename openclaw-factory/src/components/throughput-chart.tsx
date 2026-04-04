import { Card } from "@/components/ui/card";

interface ThroughputChartProps {
  data?: { label: string; production: number; staging: number }[];
}

const DEFAULT_DATA = [
  { label: "7/16", production: 8, staging: 3 },
  { label: "7/17", production: 12, staging: 5 },
  { label: "7/18", production: 6, staging: 4 },
  { label: "7/19", production: 14, staging: 6 },
  { label: "7/20", production: 10, staging: 4 },
  { label: "7/21", production: 16, staging: 7 },
  { label: "7/22", production: 11, staging: 5 },
];

export function ThroughputChart({ data = DEFAULT_DATA }: ThroughputChartProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.production, d.staging]));
  const barHeight = (value: number) => (value / maxValue) * 100;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Throughput Trend</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-xs text-on-surface-variant">Production</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/40" />
            <span className="text-xs text-on-surface-variant">Staging</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 h-32">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-1 h-24">
              <div
                className="w-3 bg-primary rounded-t transition-all duration-300"
                style={{ height: `${barHeight(d.production)}%` }}
              />
              <div
                className="w-3 bg-primary/40 rounded-t transition-all duration-300"
                style={{ height: `${barHeight(d.staging)}%` }}
              />
            </div>
            <span className="text-[10px] text-on-surface-variant">{d.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
