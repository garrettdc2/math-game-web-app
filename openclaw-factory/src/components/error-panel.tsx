import { useState } from "react";
import { AlertTriangle, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { abortPipeline, retryPipeline } from "@/lib/api";

interface ErrorPanelProps {
  taskId: string;
  error: string;
  stage: string;
  onAction?: () => void;
}

export function ErrorPanel({ taskId, error, stage, onAction }: ErrorPanelProps) {
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRetry() {
    setLoading("retry");
    try {
      await retryPipeline(taskId, stage);
      onAction?.();
    } finally {
      setLoading(null);
    }
  }

  async function handleAbort() {
    setLoading("abort");
    try {
      await abortPipeline(taskId);
      onAction?.();
    } finally {
      setLoading(null);
      setConfirmAbort(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-error">
          <AlertTriangle className="h-4 w-4" />
          Pipeline Blocked
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="whitespace-pre-wrap rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-error font-mono">
          {error}
        </pre>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={loading !== null}
          >
            {loading === "retry" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Retry {stage}
          </Button>

          {!confirmAbort ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmAbort(true)}
              disabled={loading !== null}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Abort
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">Sure?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleAbort}
                disabled={loading !== null}
              >
                {loading === "abort" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Yes, abort"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmAbort(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
