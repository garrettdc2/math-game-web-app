import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/filter-tabs";
import { PipelineCard } from "@/components/pipeline-card";
import { EmptyState } from "@/components/empty-state";
import { usePipelines, type FilterKey } from "@/hooks/use-pipelines";

export default function DashboardPage() {
  const { counts, loading, filtered } = usePipelines();
  const [filter, setFilter] = useState<FilterKey>("all");
  const navigate = useNavigate();
  const pipelines = filtered(filter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipelines</h1>
          <p className="text-sm text-text-secondary mt-1">
            {counts.active} active &middot; {counts.review} awaiting review
          </p>
        </div>
        <Button onClick={() => navigate("/new")}>
          <Plus className="h-4 w-4" />
          New Pipeline
        </Button>
      </div>

      <FilterTabs value={filter} onChange={setFilter} counts={counts} />

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-card border border-border"
            />
          ))
        ) : pipelines.length === 0 ? (
          filter === "all" ? (
            <EmptyState />
          ) : (
            <p className="py-12 text-center text-sm text-text-secondary">
              No {filter} pipelines
            </p>
          )
        ) : (
          pipelines.map((p) => (
            <PipelineCard key={p.task_id} pipeline={p} />
          ))
        )}
      </div>
    </div>
  );
}
