import { Hono } from "hono";

const analytics = new Hono();

// GET /analytics/summary — aggregate stats
analytics.get("/analytics/summary", async (c) => {
  const { registry } = await import("../lib/registry.js");
  const all = Object.values(registry.allPipelines());

  const total = all.length;
  const completed = all.filter((p) => p.stage === "done").length;
  const failed = all.filter((p) => p.stage === "blocked").length;
  const active = all.filter(
    (p) => !["done", "blocked"].includes(p.stage),
  ).length;

  // Avg cycle time — only from completed pipelines
  const completedPipelines = all.filter(
    (p) => p.stage === "done" && p.started_at > 0,
  );
  const avgCycleHours =
    completedPipelines.length > 0
      ? completedPipelines.reduce((sum, p) => sum + p.elapsed, 0) /
        completedPipelines.length /
        3600
      : 0;

  const failureRate = total > 0 ? (failed / total) * 100 : 0;

  return c.json({
    total,
    completed,
    failed,
    active,
    avgCycleHours: Math.round(avgCycleHours * 10) / 10,
    failureRate: Math.round(failureRate * 10) / 10,
  });
});

// GET /analytics/throughput — daily pipeline counts for the last 30 days
analytics.get("/analytics/throughput", async (c) => {
  const { registry } = await import("../lib/registry.js");
  const all = Object.values(registry.allPipelines());

  // Group by day (using started_at epoch)
  const days: Record<string, { started: number; completed: number }> = {};
  const now = Date.now() / 1000;

  for (let i = 29; i >= 0; i--) {
    const dayEpoch = now - i * 86400;
    const dateStr = new Date(dayEpoch * 1000).toISOString().split("T")[0];
    days[dateStr] = { started: 0, completed: 0 };
  }

  for (const p of all) {
    if (p.started_at > 0) {
      const dateStr = new Date(p.started_at * 1000).toISOString().split("T")[0];
      if (days[dateStr]) {
        days[dateStr].started++;
        if (p.stage === "done") days[dateStr].completed++;
      }
    }
  }

  const throughput = Object.entries(days).map(([date, counts]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    ...counts,
  }));

  return c.json({ throughput });
});

// GET /analytics/stage-durations — compute from events
analytics.get("/analytics/stage-durations", async (c) => {
  // Import the queryEvents function
  const { queryEvents } = await import("../lib/event-store.js");
  const { events } = queryEvents(0, undefined, 10000);

  // Group stage transition events by task_id and compute durations
  const stageTimings: Record<string, number[]> = {
    spec: [],
    architecture: [],
    development: [],
    qa: [],
    deploy: [],
  };

  // Build timeline per task_id
  const taskEvents: Record<
    string,
    Array<{ stage: string; time: number }>
  > = {};
  for (const evt of events) {
    if (
      evt.event_type === "pipeline:update" ||
      evt.event_type === "stage:start"
    ) {
      const stage = (evt.data?.stage as string) || "";
      if (stage && stageTimings[stage] !== undefined) {
        if (!taskEvents[evt.task_id]) taskEvents[evt.task_id] = [];
        taskEvents[evt.task_id].push({
          stage,
          time: new Date(evt.created_at).getTime() / 1000,
        });
      }
    }
  }

  // Compute durations between consecutive stage transitions
  for (const transitions of Object.values(taskEvents)) {
    transitions.sort((a, b) => a.time - b.time);
    for (let i = 0; i < transitions.length; i++) {
      const end =
        i + 1 < transitions.length
          ? transitions[i + 1].time
          : Date.now() / 1000;
      const durationHours = (end - transitions[i].time) / 3600;
      if (durationHours > 0 && durationHours < 48) {
        // sanity cap
        stageTimings[transitions[i].stage].push(durationHours);
      }
    }
  }

  const durations = Object.entries(stageTimings).map(([stage, times]) => ({
    stage,
    avgHours:
      times.length > 0
        ? Math.round(
            (times.reduce((a, b) => a + b, 0) / times.length) * 10,
          ) / 10
        : 0,
    count: times.length,
  }));

  return c.json({ durations });
});

// GET /analytics/failures — breakdown of failure reasons
analytics.get("/analytics/failures", async (c) => {
  const { registry } = await import("../lib/registry.js");
  const all = Object.values(registry.allPipelines());
  const failed = all.filter((p) => p.stage === "blocked" && p.error);

  // Categorize errors
  const categories: Record<string, number> = {};
  for (const p of failed) {
    const err = (p.error || "").toLowerCase();
    let category = "Other";
    if (err.includes("build") || err.includes("compile"))
      category = "Build Failures";
    else if (err.includes("test")) category = "Test Errors";
    else if (err.includes("spec") || err.includes("validation"))
      category = "Spec Errors";
    else if (err.includes("deploy") || err.includes("timeout"))
      category = "Deploy Timeout";
    categories[category] = (categories[category] || 0) + 1;
  }

  const total = failed.length || 1;
  const failures = Object.entries(categories).map(([name, count]) => ({
    name,
    count,
    pct: Math.round((count / total) * 100),
  }));

  return c.json({ failures, totalFailed: failed.length });
});

export default analytics;
