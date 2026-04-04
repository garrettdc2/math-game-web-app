import { useState, useEffect } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPipelineMemory } from "@/lib/api";

interface MemoryViewerProps {
  taskId: string;
}

export function MemoryViewer({ taskId }: MemoryViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    getPipelineMemory(taskId)
      .then((res) => setContent(res.content))
      .catch(() => setContent("Failed to load memory"))
      .finally(() => setLoading(false));
  }, [taskId, expanded]);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-text-secondary" />
            Agent Memory
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-tertiary" />
          )}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="h-20 rounded-lg bg-elevated" />
          ) : (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-page p-3 text-xs text-text-secondary font-mono border border-border">
              {content || "No memory found"}
            </pre>
          )}
        </CardContent>
      )}
    </Card>
  );
}
