import { useState, useEffect, useCallback, useRef } from "react";
import { listPipelines, getPendingGates, type PipelineDict, type PendingGate } from "@/lib/api";
import { useSSEEvent, useSSE } from "./use-sse";

const STAGES = ["spec", "architecture", "development", "qa", "deploy"] as const;
const STAGE_LABELS: Record<string, string> = {
  spec: "Spec",
  architecture: "Architecture",
  development: "Development",
  qa: "QA",
  deploy: "Deploy",
  done: "Done",
  blocked: "Blocked",
};

export interface EnrichedPipeline extends PipelineDict {
  stage_label: string;
  stages: Array<{ name: string; label: string; status: string }>;
  pending_gate: PendingGate | null;
}

export type FilterKey = "all" | "review" | "active" | "completed" | "failed";

function enrichPipeline(
  p: PipelineDict,
  gates: PendingGate[]
): EnrichedPipeline {
  const hasGate = gates.some((g) => g.task_id === p.task_id);
  const stageIdx = STAGES.indexOf(p.stage as (typeof STAGES)[number]);

  const stages = STAGES.map((s, i) => {
    let status: string;
    if (p.stage === "done") status = "done";
    else if (p.stage === "blocked") status = i <= stageIdx ? "done" : i === stageIdx + 1 ? "failed" : "pending";
    else if (i < stageIdx) status = "done";
    else if (i === stageIdx) status = "active";
    else status = "pending";
    return { name: s, label: STAGE_LABELS[s], status };
  });

  return {
    ...p,
    has_pending_gate: hasGate,
    stage_label: STAGE_LABELS[p.stage] || p.stage,
    stages,
    pending_gate: gates.find((g) => g.task_id === p.task_id) || null,
  };
}

export function usePipelines() {
  const [pipelines, setPipelines] = useState<EnrichedPipeline[]>([]);
  const [gates, setGates] = useState<PendingGate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [pData, gData] = await Promise.all([
        listPipelines(),
        getPendingGates(),
      ]);
      const pList = Object.values(pData.pipelines);
      setGates(gData.gates);
      setPipelines(pList.map((p) => enrichPipeline(p, gData.gates)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refetch on reconnection (T014)
  const { connectionStatus } = useSSE();
  const prevStatusRef = useRef(connectionStatus);
  useEffect(() => {
    if (connectionStatus === "connected" && prevStatusRef.current === "reconnecting") {
      fetchData();
    }
    prevStatusRef.current = connectionStatus;
  }, [connectionStatus, fetchData]);

  // Live updates via SSE
  useSSEEvent("pipeline:created", () => fetchData());
  useSSEEvent("pipeline:update", () => fetchData());
  useSSEEvent("pipeline:done", () => fetchData());
  useSSEEvent("gate:waiting", () => fetchData());
  useSSEEvent("gate:resolved", () => fetchData());

  const counts = {
    all: pipelines.length,
    review: pipelines.filter((p) => p.has_pending_gate && !["done", "blocked"].includes(p.stage)).length,
    active: pipelines.filter((p) => !p.has_pending_gate && !["done", "blocked"].includes(p.stage)).length,
    completed: pipelines.filter((p) => p.stage === "done").length,
    failed: pipelines.filter((p) => p.stage === "blocked").length,
  };

  function filtered(filter: FilterKey): EnrichedPipeline[] {
    switch (filter) {
      case "review":
        return pipelines.filter((p) => p.has_pending_gate && !["done", "blocked"].includes(p.stage));
      case "active":
        return pipelines.filter((p) => !p.has_pending_gate && !["done", "blocked"].includes(p.stage));
      case "completed":
        return pipelines.filter((p) => p.stage === "done");
      case "failed":
        return pipelines.filter((p) => p.stage === "blocked");
      default:
        return pipelines;
    }
  }

  return { pipelines, counts, loading, refetch: fetchData, filtered, gates };
}
