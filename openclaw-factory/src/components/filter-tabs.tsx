import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterKey } from "@/hooks/use-pipelines";

interface FilterTabsProps {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
  counts: Record<FilterKey, number>;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

export function FilterTabs({ value, onChange, counts }: FilterTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as FilterKey)}>
      <TabsList>
        {FILTERS.map(({ key, label }) => (
          <TabsTrigger key={key} value={key}>
            {label}
            {counts[key] > 0 && (
              <span className="ml-1.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-secondary tabular-nums">
                {counts[key]}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
