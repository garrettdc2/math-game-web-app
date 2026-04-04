import { useState } from "react";
import { ShieldCheck, Check, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approvePipeline } from "@/lib/api";

interface GatePanelProps {
  taskId: string;
  gateName: string;
  onResolved?: () => void;
}

export function GatePanel({ taskId, gateName, onResolved }: GatePanelProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);

  async function handle(approved: boolean) {
    setSubmitting(approved ? "approve" : "reject");
    try {
      await approvePipeline(taskId, gateName, approved, feedback);
      onResolved?.();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Human Gate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mb-1.5 block">
            Rework Notes
          </label>
          <Textarea
            placeholder="Provide specific feedback if requesting a rework..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => handle(true)}
            disabled={submitting !== null}
          >
            {submitting === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve Stage
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handle(false)}
            disabled={submitting !== null}
          >
            {submitting === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Request Rework
          </Button>
        </div>

        <p className="text-xs text-on-surface-variant text-center pt-2">
          Approval will freeze this spec/iteration and automatically trigger the <strong>Architecture Agent</strong> for {taskId}.
        </p>
      </CardContent>
    </Card>
  );
}
