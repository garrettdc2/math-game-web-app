import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ExternalLink, FileText, User, DollarSign } from "lucide-react";
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
  architecture: "Arch",
  development: "Dev",
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
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-lg bg-surface-container animate-pulse" />
          <div className="h-32 rounded-lg bg-surface-container animate-pulse" />
          <div className="h-64 rounded-lg bg-surface-container animate-pulse" />
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 text-center">
        <p className="text-on-surface-variant">Pipeline not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const stages = enrichStages(pipeline.stage);
  const hasGate = pipeline.has_pending_gate;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-3">
          <span className="font-mono">{pipeline.task_id}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {pipeline.title || pipeline.task_id}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Stage: {STAGE_LABELS[pipeline.stage] || pipeline.stage} &middot; Elapsed: {pipeline.elapsed_display || "—"}
            </p>
          </div>
          <Badge variant={stageVariant(pipeline.stage)} className="shrink-0">
            {pipeline.stage === "spec" ? "In Spec" : STAGE_LABELS[pipeline.stage] || pipeline.stage}
          </Badge>
        </div>
      </div>

      {/* Stepper */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <StageStepper stages={stages} />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Content */}
        <div className="col-span-2 space-y-6">
          {/* Agent Output */}
          <Card className="bg-[#1a1f23] border-0">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-white/80 text-sm font-normal">
                  PM AGENT OUTPUT: SPECIFICATION_V1.MD
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto p-4">
                {logs.length === 0 ? (
                  <pre className="font-mono text-sm text-white/40 whitespace-pre-wrap">
                    Waiting for agent output...
                  </pre>
                ) : (
                  <pre className="font-mono text-sm text-white/80 whitespace-pre-wrap">
                    {logs.join('\n')}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error panel */}
          {pipeline.stage === "blocked" && pipeline.error && (
            <ErrorPanel
              taskId={pipeline.task_id}
              error={pipeline.error}
              stage={pipeline.stage}
              onAction={fetchData}
            />
          )}

          {/* Memory */}
          <MemoryViewer taskId={pipeline.task_id} />
        </div>

        {/* Right Column - Gate Panel + Metadata */}
        <div className="space-y-4">
          {/* Gate panel */}
          {hasGate && pipeline.stage !== "done" && pipeline.stage !== "blocked" && (
            <GatePanel
              taskId={pipeline.task_id}
              gateName={`gate_${pipeline.stage}_review`}
              onResolved={fetchData}
            />
          )}

          {/* Pipeline Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <User className="h-4 w-4" />
                  Owner
                </div>
                <span className="text-sm text-on-surface">System</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Clock className="h-4 w-4" />
                  Last Active
                </div>
                <span className="text-sm text-on-surface">{pipeline.elapsed_display || "12m ago"}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <DollarSign className="h-4 w-4" />
                  Total Cost
                </div>
                <span className="text-sm text-on-surface">
                  {pipeline.elapsed > 0 ? `$${(pipeline.elapsed / 3600 * 0.50).toFixed(2)}` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
