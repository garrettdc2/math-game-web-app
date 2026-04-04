import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { startPipeline } from "@/lib/api";

const TEMPLATES = [
  { id: "landing", title: "Landing Page", desc: "Single-page marketing site with hero, features, and CTA" },
  { id: "crud", title: "CRUD App", desc: "Full-stack app with database, auth, and CRUD operations" },
  { id: "dashboard", title: "Dashboard", desc: "Data dashboard with charts, tables, and filters" },
];

export default function NewPipelinePage() {
  const navigate = useNavigate();
  const [taskId, setTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId.trim() || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await startPipeline(taskId.trim(), title.trim());
      if (res.error) {
        setError(res.error);
      } else {
        navigate(`/pipeline/${res.task_id}`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function useTemplate(tmpl: typeof TEMPLATES[number]) {
    const id = `${tmpl.id}-${Date.now().toString(36)}`;
    setTaskId(id);
    setTitle(tmpl.title);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Button>

      <h1 className="text-xl font-semibold tracking-tight mb-2">New Pipeline</h1>
      <p className="text-sm text-text-secondary mb-8">
        Start a new software factory pipeline to build an application
      </p>

      {/* Quick-start templates */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {TEMPLATES.map((tmpl) => (
          <Card
            key={tmpl.id}
            className="cursor-pointer hover:bg-hover"
            onClick={() => useTemplate(tmpl)}
          >
            <CardContent className="p-3">
              <p className="text-sm font-medium text-text-primary">{tmpl.title}</p>
              <p className="text-[11px] text-text-tertiary mt-1">{tmpl.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 block">
                Task ID
              </label>
              <Input
                placeholder="e.g. SFT-001"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 block">
                Title
              </label>
              <Input
                placeholder="Describe what to build..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-status-failed">{error}</p>
            )}

            <Button type="submit" disabled={submitting || !taskId.trim() || !title.trim()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Start Pipeline
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
