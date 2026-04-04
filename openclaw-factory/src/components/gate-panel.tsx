import { useState } from "react";
import { ShieldAlert, Check, X, Loader2 } from "lucide-react";
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
        <CardTitle className="flex items-center gap-2 text-text-secondary">
          <ShieldAlert className="h-4 w-4" />
          Approval Required: {gateName.replace(/_/g, " ")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Optional feedback for the agent..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            variant="success"
            onClick={() => handle(true)}
            disabled={submitting !== null}
          >
            {submitting === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            variant="danger"
            onClick={() => handle(false)}
            disabled={submitting !== null}
          >
            {submitting === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
