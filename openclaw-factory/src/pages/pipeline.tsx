import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StageStepper } from "@/components/stage-stepper";
import { GatePanel } from "@/components/gate-panel";
import { ErrorPanel } from "@/components/error-panel";
import { MemoryViewer } from "@/components/memory-viewer";
import { getPipelineStatus, getPipelineLogs, type PipelineDict } from "@/lib/api";
import { useSSEEvent } from "@/hooks/use-sse";

const STAGES = ["spec", "architecture", "development", "qa", "deploy"] as const;
const STAGE_LABELS: Record<string, string> = {
  spec: "Spec",
  architecture: "Architecture",
  development: "Development",
  qa: "QA",
  deploy: "Deploy",
};

function enrichStages(stage: string) {
  const stageIdx = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return STAGES.map((s, i) => {
    let status: string;
    if (stage === "done") status = "done";
    else if (stage === "blocked")
      status = i <= stageIdx ? "done" : i === stageIdx + 1 ? "failed" : "pending";
    else if (i < stageIdx) status = "done";
    else if (i === stageIdx) status = "active";
    else status = "pending";
    return { name: s, label: STAGE_LABELS[s], status };
  });
}

function stageVariant(stage: string): "running" | "done" | "waiting" | "failed" {
  if (stage === "done") return "done";
  if (stage === "blocked") return "failed";
  return "running";
}

export default function PipelinePage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<PipelineDict | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    try {
      const [pData, lData] = await Promise.all([
        getPipelineStatus(taskId),
        getPipelineLogs(taskId),
      ]);
      setPipeline(pData);
      setLogs(lData.logs || []);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSSEEvent("pipeline:update", (data) => {
    if (data.task_id === taskId) fetchData();
  });
  useSSEEvent("pipeline:done", (data) => {
    if (data.task_id === taskId) fetchData();
  });
  useSSEEvent("gate:waiting", (data) => {
    if (data.task_id === taskId) fetchData();
  });
  useSSEEvent("gate:resolved", (data) => {
    if (data.task_id === taskId) fetchData();
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-lg bg-card border border-border" />
          <div className="h-32 rounded-lg bg-card border border-border" />
          <div className="h-64 rounded-lg bg-card border border-border" />
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-center">
        <p className="text-text-secondary">Pipeline not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const stages = enrichStages(pipeline.stage);
  const hasGate = pipeline.has_pending_gate;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {pipeline.title || pipeline.task_id}
            </h1>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="font-mono text-[11px] text-text-tertiary">
                {pipeline.task_id}
              </span>
              {pipeline.elapsed_display && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <Clock className="h-3 w-3" />
                  {pipeline.elapsed_display}
                </span>
              )}
              {pipeline.repo_name && (
                <span className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  {pipeline.repo_name}
                </span>
              )}
            </div>
          </div>
          <Badge variant={stageVariant(pipeline.stage)}>
            {STAGE_LABELS[pipeline.stage] || pipeline.stage}
          </Badge>
        </div>
      </div>

      {/* Stepper */}
      <Card className="mb-6">
        <CardContent className="flex justify-center py-6">
          <StageStepper stages={stages} />
        </CardContent>
      </Card>

      {/* Gate panel */}
      {hasGate && pipeline.stage !== "done" && pipeline.stage !== "blocked" && (
        <div className="mb-6">
          <GatePanel
            taskId={pipeline.task_id}
            gateName={`gate_${pipeline.stage}_review`}
            onResolved={fetchData}
          />
        </div>
      )}

      {/* Error panel */}
      {pipeline.stage === "blocked" && pipeline.error && (
        <div className="mb-6">
          <ErrorPanel
            taskId={pipeline.task_id}
            error={pipeline.error}
            stage={pipeline.stage}
            onAction={fetchData}
          />
        </div>
      )}

      {/* Logs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-text-secondary">No logs yet</p>
          ) : (
            <div className="max-h-80 overflow-auto space-y-1">
              {logs.map((log, i) => (
                <p
                  key={i}
                  className="font-mono text-xs text-text-secondary leading-relaxed"
                >
                  {log}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory */}
      <MemoryViewer taskId={pipeline.task_id} />
    </div>
  );
}
