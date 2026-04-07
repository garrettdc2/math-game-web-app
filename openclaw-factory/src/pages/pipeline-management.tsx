import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePipelines, type EnrichedPipeline } from "@/hooks/use-pipelines";
import { useSSE } from "@/hooks/use-sse";

const PAGE_SIZE = 10;

type PipelineStatus = "SUCCESS" | "FAILED" | "WAITING" | "RUNNING";

function deriveStatus(p: EnrichedPipeline): PipelineStatus {
  if (p.stage === "done") return "SUCCESS";
  if (p.stage === "blocked") return "FAILED";
  if (p.has_pending_gate) return "WAITING";
  return "RUNNING";
}

function StatusBadge({ status }: { status: PipelineStatus }) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary">
        SUCCESS
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-error/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-error">
        FAILED
      </span>
    );
  }
  if (status === "WAITING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-600">
        WAITING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container-highest px-2.5 py-1 text-[11px] font-bold tracking-wide text-on-surface-variant">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-on-surface-variant/60 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-on-surface-variant" />
      </span>
      RUNNING
    </span>
  );
}

function formatDate(epoch: number): string {
  if (!epoch) return "--";
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }) + " " + d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatAvgBuildTime(pipelines: EnrichedPipeline[]): string {
  const completed = pipelines.filter((p) => p.stage === "done" && p.elapsed > 0);
  if (completed.length === 0) return "--:--";
  const avgSeconds = completed.reduce((s, p) => s + p.elapsed, 0) / completed.length;
  const hours = Math.floor(avgSeconds / 3600);
  const minutes = Math.floor((avgSeconds % 3600) / 60);
  const seconds = Math.floor(avgSeconds % 60);
  if (hours > 0) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}m`;
}

function healthLabel(connectionStatus: string): string {
  if (connectionStatus === "connected") return "NOMINAL";
  if (connectionStatus === "reconnecting") return "RECONNECTING";
  return "OFFLINE";
}

function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/5">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-20 animate-pulse rounded bg-surface-container" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonStat() {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-6 border border-outline-variant/15">
      <div className="h-3 w-24 animate-pulse rounded bg-surface-container mb-3" />
      <div className="h-10 w-16 animate-pulse rounded bg-surface-container" />
      <div className="mt-3 h-1 w-full rounded-full bg-surface-container" />
    </div>
  );
}

export default function PipelineManagementPage() {
  const navigate = useNavigate();
  const { pipelines, counts, loading } = usePipelines();
  const { connectionStatus } = useSSE();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(pipelines.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = (clampedPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, pipelines.length);
  const pagePipelines = pipelines.slice(startIdx, endIdx);

  const successRate = counts.all > 0
    ? ((counts.completed / counts.all) * 100).toFixed(1) + "%"
    : "\u2014";

  const livePct = counts.active / Math.max(counts.all, 1) * 100;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline Management</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Orchestrating and monitoring automated software production cycles.
          </p>
        </div>
        <Button onClick={() => navigate("/new")}>
          <Plus className="h-4 w-4" />
          Create New Spec
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            {/* Live Pipelines */}
            <div className="rounded-xl bg-surface-container-lowest p-6 border border-outline-variant/15">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-3">
                Live Pipelines
              </p>
              <p className="text-4xl font-bold text-primary tabular-nums">{counts.active}</p>
              <div className="mt-3 h-1 w-full rounded-full bg-surface-container">
                <div
                  className="h-1 rounded-full bg-primary transition-all"
                  style={{ width: `${livePct}%` }}
                />
              </div>
            </div>

            {/* Success Rate */}
            <div className="rounded-xl bg-surface-container-lowest p-6 border border-outline-variant/15">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-3">
                Success Rate
              </p>
              <p className="text-4xl font-bold text-on-surface tabular-nums">{successRate}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">
                  {counts.completed} OF {counts.all} COMPLETED
                </span>
              </div>
            </div>

            {/* Total Pipelines */}
            <div className="rounded-xl bg-surface-container-lowest p-6 border border-outline-variant/15">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-3">
                Total Pipelines
              </p>
              <p className="text-4xl font-bold tabular-nums">{counts.all}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60">
                  {counts.failed} FAILED &middot; {counts.active} ACTIVE
                </span>
              </div>
            </div>

            {/* System Health */}
            <div className="rounded-xl bg-surface-container-lowest p-6 border border-outline-variant/15">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-3">
                System Health
              </p>
              <p className="text-4xl font-bold tabular-nums">{healthLabel(connectionStatus)}</p>
              <p className="mt-3 text-[10px] text-on-surface-variant/60 font-mono">
                STATUS: {connectionStatus.toUpperCase()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Pipeline Table -- Production Stream */}
      <div className="mb-8 rounded-xl bg-surface-container-lowest border border-outline-variant/15">
        {/* Table Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-semibold text-on-surface">Production Stream</h2>
          <div className="flex items-center gap-4">
            <button className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dim">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
            <button className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dim">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : pagePipelines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                    No pipelines found. Create a new spec to get started.
                  </td>
                </tr>
              ) : (
                pagePipelines.map((pipeline) => {
                  const status = deriveStatus(pipeline);
                  return (
                    <tr
                      key={pipeline.task_id}
                      className="border-b border-outline-variant/5 hover:bg-surface-container/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">
                        {pipeline.task_id}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-on-surface">{pipeline.title}</p>
                          <p className="text-[10px] font-mono text-on-surface-variant/60 mt-0.5">
                            STAGE: {pipeline.stage_label.toUpperCase()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-surface-container-highest px-2.5 py-1 text-[11px] font-bold tracking-wide text-on-surface-variant">
                          {pipeline.badge_label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-mono">
                        {formatDate(pipeline.started_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-mono">
                        {pipeline.elapsed_display || "--"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/pipeline/${pipeline.task_id}`)}
                          className="text-xs text-primary hover:text-primary-dim font-medium cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10">
          <p className="text-xs text-on-surface-variant">
            {pipelines.length === 0
              ? "No pipelines"
              : `Showing ${startIdx + 1}-${endIdx} of ${pipelines.length} Pipelines`}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={clampedPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Factory Throughput Analysis */}
      <div className="rounded-xl bg-surface-container-low p-8 border border-outline-variant/10 relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight mb-2">Factory Throughput Analysis</h2>
          <p className="text-sm text-on-surface-variant max-w-2xl mb-6">
            {counts.all > 0
              ? `Pipeline success rate is at ${successRate} across ${counts.all} total pipelines. ${counts.active} pipelines are currently active.`
              : "No pipeline data available yet. Create a new spec to begin production."}
          </p>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-1">
                Avg Build Time
              </p>
              <p className="text-lg font-bold text-primary tabular-nums">
                {loading ? "--:--" : formatAvgBuildTime(pipelines)}
              </p>
            </div>
            <div className="h-8 w-px bg-outline-variant/20" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-1">
                Completed
              </p>
              <p className="text-lg font-bold text-on-surface tabular-nums">{counts.completed}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
