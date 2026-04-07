import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Activity,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FilterTabs } from "@/components/filter-tabs";
import { PipelineTable } from "@/components/pipeline-table";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { ThroughputChart } from "@/components/throughput-chart";
import { SystemHealth } from "@/components/system-health";
import { usePipelines, type FilterKey } from "@/hooks/use-pipelines";
import { useSSE } from "@/hooks/use-sse";
import {
  getAnalyticsSummary,
  getAnalyticsThroughput,
  getStageDurations,
  getFailureAnalysis,
  getEventHistory,
  getServiceModes,
  type AnalyticsSummary,
  type ThroughputDay,
  type StageDuration,
  type FailureCategory,
  type EventRecord,
  type ServiceModes,
  cleanupDeploys,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Stage label mapping                                               */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  spec: "Spec",
  architecture: "Arch",
  development: "Dev",
  qa: "QA",
  deploy: "Deploy",
  done: "Done",
  blocked: "Blocked",
};

/* ------------------------------------------------------------------ */
/*  Analytics data hook                                               */
/* ------------------------------------------------------------------ */

function useAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [throughput, setThroughput] = useState<ThroughputDay[]>([]);
  const [durations, setDurations] = useState<StageDuration[]>([]);
  const [failures, setFailures] = useState<FailureCategory[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAnalyticsSummary(),
      getAnalyticsThroughput(),
      getStageDurations(),
      getFailureAnalysis(),
      getEventHistory(0, 20),
    ])
      .then(([sum, thr, dur, fail, evt]) => {
        setSummary(sum);
        setThroughput(thr.throughput);
        setDurations(dur.durations);
        setFailures(fail.failures);
        setEvents(evt.events);
      })
      .finally(() => setLoading(false));
  }, []);

  return { summary, throughput, durations, failures, events, loading };
}

/* ------------------------------------------------------------------ */
/*  Donut chart helper                                                */
/* ------------------------------------------------------------------ */

const DONUT_COLORS = [
  "var(--color-primary)",
  "var(--color-on-surface-variant)",
  "var(--color-outline-variant)",
  "var(--color-error)",
];

function DonutChart({
  segments,
  centerLabel,
}: {
  segments: FailureCategory[];
  centerLabel: string;
}) {
  const total = segments.reduce((s, f) => s + f.pct, 0);
  const radius = 60;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[200px] mx-auto">
      {segments.map((seg, i) => {
        const dashLen = (seg.pct / total) * circumference;
        const dashOffset = -offset;
        offset += dashLen;
        return (
          <circle
            key={seg.name}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 80 80)"
          />
        );
      })}
      <text
        x="80"
        y="74"
        textAnchor="middle"
        className="fill-on-surface text-lg font-bold"
        fontSize="18"
        fontWeight="700"
      >
        {centerLabel}
      </text>
      <text
        x="80"
        y="94"
        textAnchor="middle"
        className="fill-on-surface-variant"
        fontSize="11"
      >
        Total
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics - Throughput area chart (SVG)                           */
/* ------------------------------------------------------------------ */

function AnalyticsThroughputChart({ data }: { data: ThroughputDay[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-6">
        <CardHeader className="pb-4">
          <CardTitle>Pipeline Throughput</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-sm text-on-surface-variant">
            No data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const values = data.map((d) => d.completed);
  const max = Math.max(...values, 1);
  const w = 600;
  const h = 180;
  const padX = 0;
  const padY = 10;

  const points = values.map((v, i) => {
    const x = padX + (i / Math.max(values.length - 1, 1)) * (w - padX * 2);
    const y = h - padY - (v / max) * (h - padY * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  // Pick ~5 evenly-spaced date labels
  const labelCount = Math.min(5, data.length);
  const dateLabels: string[] = [];
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
    dateLabels.push(data[idx].label);
  }

  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <CardTitle>Pipeline Throughput</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Dotted grid background */}
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Horizontal dotted lines */}
            {[0.25, 0.5, 0.75].map((frac) => (
              <line
                key={frac}
                x1="0"
                y1={h * frac}
                x2={w}
                y2={h * frac}
                stroke="var(--color-outline-variant)"
                strokeWidth="0.5"
                strokeDasharray="3 4"
                opacity="0.4"
              />
            ))}
            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGrad)" />
            {/* Stroke line */}
            <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
          </svg>
          {/* Date labels */}
          <div className="flex justify-between mt-2">
            {dateLabels.map((d) => (
              <span key={d} className="text-[10px] text-on-surface-variant">
                {d}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Event display helpers                                             */
/* ------------------------------------------------------------------ */

function eventDisplayName(eventType: string): string {
  switch (eventType) {
    case "pipeline:done":
      return "Completed";
    case "pipeline:update":
      return "Stage Change";
    case "pipeline:created":
      return "Created";
    case "gate:waiting":
      return "Gate Waiting";
    case "gate:resolved":
      return "Gate Resolved";
    default:
      return eventType;
  }
}

function eventBadgeClass(eventType: string): string {
  switch (eventType) {
    case "pipeline:done":
      return "bg-primary/10 text-primary";
    case "pipeline:update":
      return "bg-surface-container text-on-surface-variant";
    case "pipeline:created":
      return "bg-primary/10 text-primary";
    case "gate:waiting":
      return "bg-amber-50 text-amber-700";
    case "gate:resolved":
      return "bg-primary/10 text-primary";
    default:
      return "bg-surface-container text-on-surface-variant";
  }
}

function eventDescription(event: EventRecord): string {
  const data = event.data || {};
  return (
    (data.stage as string) ||
    (data.detail as string) ||
    (data.title as string) ||
    event.event_type
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton for Analytics                                    */
/* ------------------------------------------------------------------ */

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-end">
        <div className="h-10 w-40 rounded-lg bg-surface-container" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-lg bg-surface-container" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-surface-container" />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-64 rounded-lg bg-surface-container" />
        <div className="h-64 rounded-lg bg-surface-container" />
      </div>
      <div className="h-64 rounded-lg bg-surface-container" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics Tab                                                     */
/* ------------------------------------------------------------------ */

function AnalyticsView() {
  const { summary, throughput, durations, failures, events, loading } = useAnalytics();

  if (loading) return <AnalyticsSkeleton />;

  const maxHours = durations.length > 0 ? Math.max(...durations.map((d) => d.avgHours)) : 1;

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors">
          <Calendar className="h-4 w-4 text-on-surface-variant" />
          Last 30 Days
          <ChevronDown className="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6 rounded-lg bg-surface-container-lowest">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
            Total Completed
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.5rem] font-bold tracking-tight tabular-nums leading-none text-on-surface">
              {summary?.completed ?? "\u2014"}
            </span>
          </div>
        </Card>

        <Card className="p-6 rounded-lg bg-surface-container-lowest">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
            Avg Cycle Time
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.5rem] font-bold tracking-tight tabular-nums leading-none text-on-surface">
              {summary && summary.avgCycleHours > 0
                ? summary.avgCycleHours.toFixed(1)
                : "\u2014"}
            </span>
            {summary && summary.avgCycleHours > 0 && (
              <span className="text-xl font-medium text-on-surface-variant">h</span>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-lg bg-surface-container-lowest">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
            Failure Rate
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.5rem] font-bold tracking-tight tabular-nums leading-none text-on-surface">
              {summary && summary.failureRate > 0
                ? summary.failureRate.toFixed(1)
                : "\u2014"}
            </span>
            {summary && summary.failureRate > 0 && (
              <span className="text-xl font-medium text-on-surface-variant">%</span>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-lg bg-surface-container-lowest">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
            Active Pipelines
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.5rem] font-bold tracking-tight tabular-nums leading-none text-on-surface">
              {summary?.active ?? "\u2014"}
            </span>
          </div>
        </Card>
      </div>

      {/* Throughput Area Chart */}
      <AnalyticsThroughputChart data={throughput} />

      {/* Two-column: Stage Duration + Failure Analysis */}
      <div className="grid grid-cols-3 gap-4">
        {/* Stage Duration Breakdown - 2/3 */}
        <Card className="col-span-2 p-6">
          <CardHeader className="pb-4">
            <CardTitle>Stage Duration Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {durations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-on-surface-variant">
                No stage data yet
              </div>
            ) : (
              <div className="space-y-4">
                {durations.map((d) => (
                  <div key={d.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-on-surface">
                        {STAGE_LABELS[d.stage] || d.stage}
                      </span>
                      <span className="text-sm text-on-surface-variant tabular-nums">
                        {d.avgHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-container-low">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${(d.avgHours / maxHours) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure Analysis - 1/3 */}
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle>Failure Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {failures.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-on-surface-variant">
                No failures recorded
              </div>
            ) : (
              <>
                <DonutChart
                  segments={failures}
                  centerLabel={
                    summary && summary.failureRate > 0
                      ? `${summary.failureRate.toFixed(1)}%`
                      : "\u2014"
                  }
                />
                <div className="mt-4 space-y-2">
                  {failures.map((seg, i) => (
                    <div key={seg.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{
                            backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                          }}
                        />
                        <span className="text-xs text-on-surface-variant">{seg.name}</span>
                      </div>
                      <span className="text-xs font-medium text-on-surface tabular-nums">
                        {seg.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card className="p-6">
        <CardHeader className="pb-4">
          <CardTitle>Recent Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-on-surface-variant">
              No activity yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="pb-3 pr-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Timestamp
                    </th>
                    <th className="pb-3 pr-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Pipeline ID
                    </th>
                    <th className="pb-3 pr-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Event
                    </th>
                    <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((row) => (
                    <tr
                      key={row.seq}
                      className="border-b border-outline-variant/10 last:border-0"
                    >
                      <td className="py-3 pr-4 text-xs text-on-surface-variant font-mono tabular-nums">
                        {formatTimestamp(row.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary font-mono">
                          {row.task_id}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            eventBadgeClass(row.event_type)
                          )}
                        >
                          {eventDisplayName(row.event_type)}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-on-surface-variant">
                        {eventDescription(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Dashboard Page                                                    */
/* ================================================================== */

type DashboardTab = "pipeline" | "analytics";

function ServiceModesBanner({ modes }: { modes: ServiceModes | null }) {
  if (!modes) return null;
  const localServices = (["git", "deploy", "database"] as const).filter(
    (k) => modes[k] === "local"
  );
  if (localServices.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-amber-600">Local Mode</span>
        <span className="text-on-surface-variant">
          {localServices.join(", ")} {localServices.length === 1 ? "is" : "are"} running locally
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { counts, loading, filtered } = usePipelines();
  const { connectionStatus } = useSSE();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState<DashboardTab>("pipeline");
  const [serviceModes, setServiceModes] = useState<ServiceModes | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getServiceModes().then(setServiceModes).catch(() => {});
  }, []);
  const pipelines = filtered(filter);

  // Calculate metrics
  const totalPipelines = counts.all;
  const successRate = totalPipelines > 0
    ? ((counts.completed / totalPipelines) * 100).toFixed(1)
    : "0.0";

  // Calculate throughput from pipelines started in the last 7 days
  const sevenDaysAgo = Date.now() / 1000 - 7 * 86400;
  const recentCount = pipelines.filter((p) => p.started_at > sevenDaysAgo).length;
  const throughput = recentCount > 0 ? (recentCount / 7).toFixed(1) : "0.0";

  // Calculate average time from completed pipelines with elapsed data
  const completedPipelines = pipelines.filter((p) => p.stage === "done" && p.elapsed > 0);
  const avgTimeHours = completedPipelines.length > 0
    ? (completedPipelines.reduce((sum, p) => sum + p.elapsed, 0) / completedPipelines.length / 3600)
    : 0;
  const avgTime = avgTimeHours > 0 ? avgTimeHours.toFixed(1) : "\u2014";

  // Compute real chart data from pipelines for Pipeline tab ThroughputChart
  const chartData = useMemo(() => {
    const days: Record<string, { production: number; staging: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      days[label] = { production: 0, staging: 0 };
    }
    for (const p of pipelines) {
      if (p.started_at > 0) {
        const d = new Date(p.started_at * 1000);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        if (days[label]) {
          days[label].production++;
        }
      }
    }
    return Object.entries(days).map(([label, v]) => ({ label, ...v }));
  }, [pipelines]);

  // Compute real health items for Pipeline tab SystemHealth
  const healthItems = useMemo(
    () => [
      {
        name: "SSE Stream",
        status:
          connectionStatus === "connected"
            ? ("healthy" as const)
            : connectionStatus === "reconnecting"
              ? ("degraded" as const)
              : ("offline" as const),
        detail: connectionStatus,
      },
      { name: "API Server", status: "healthy" as const, detail: "Responding" },
      {
        name: "Pipeline Registry",
        status: pipelines.length > 0 ? ("healthy" as const) : ("degraded" as const),
        detail: `${pipelines.length} pipelines`,
      },
    ],
    [connectionStatus, pipelines.length]
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Factory Overview</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time telemetry from the headless software synthesis core. All systems nominal across active synthesis pipelines.
          </p>
        </div>
        <Button onClick={() => navigate("/new")}>
          <Plus className="h-4 w-4" />
          New Pipeline
        </Button>
      </div>

      <ServiceModesBanner modes={serviceModes} />

      {/* Tab Bar */}
      <div className="mb-8 flex gap-6 border-b border-outline-variant/20">
        {(
          [
            { key: "pipeline", label: "Pipeline" },
            { key: "analytics", label: "Analytics" },
          ] as const
        ).map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "pb-3 text-sm transition-colors cursor-pointer",
              activeTab === tab.key
                ? "text-primary font-bold border-b-2 border-primary"
                : "text-on-surface-variant font-medium hover:text-on-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "pipeline" ? (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Active Pipelines"
              value={counts.active}
              icon={Activity}
              subtitle={`of ${counts.all} total`}
              progress={counts.all > 0 ? (counts.active / counts.all) * 100 : 0}
            />
            <MetricCard
              label="Throughput"
              value={`${throughput}`}
              unit="/day"
              icon={TrendingUp}
              subtitle="last 7 days"
            />
            <MetricCard
              label="Success Rate"
              value={`${successRate}%`}
              icon={CheckCircle}
              progress={parseFloat(successRate)}
            />
            <MetricCard
              label="Avg. Time to Complete"
              value={avgTime}
              unit={avgTime !== "\u2014" ? "hrs" : undefined}
              icon={Clock}
              subtitle={`${counts.completed} completed`}
            />
          </div>

          {/* Pipeline Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">All Running Pipelines</h2>
              <div className="flex items-center gap-4">
                <button
                  className="text-xs text-primary hover:text-primary-dim"
                  onClick={() => {
                    cleanupDeploys().then((res) => {
                      if (res.cleaned?.length) {
                        alert(`Cleaned ${res.cleaned.length} workspace(s): ${res.cleaned.join(", ")}`);
                      } else {
                        alert("No workspaces to clean up.");
                      }
                    }).catch(() => alert("Cleanup failed"));
                  }}
                >
                  Clean Up Workspaces
                </button>
                <button className="text-xs text-primary hover:text-primary-dim">Export Logs</button>
                <button className="text-xs text-primary hover:text-primary-dim">Filters</button>
              </div>
            </div>

            <FilterTabs value={filter} onChange={setFilter} counts={counts} />

            <div className="mt-4">
              {loading ? (
                <div className="h-48 rounded-xl bg-surface-container animate-pulse" />
              ) : pipelines.length === 0 ? (
                filter === "all" ? (
                  <EmptyState />
                ) : (
                  <p className="py-12 text-center text-sm text-on-surface-variant">
                    No {filter} pipelines
                  </p>
                )
              ) : (
                <PipelineTable pipelines={pipelines} />
              )}
            </div>
          </div>

          {/* Bottom Section: Chart + System Health */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <ThroughputChart data={chartData} />
            </div>
            <div>
              <SystemHealth items={healthItems} />
            </div>
          </div>
        </>
      ) : (
        <AnalyticsView />
      )}
    </div>
  );
}
