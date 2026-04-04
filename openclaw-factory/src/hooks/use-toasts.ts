import { toast } from "sonner";
import { useSSEEvent } from "./use-sse";

export function useToastNotifications() {
  useSSEEvent("pipeline:done", (data) => {
    toast.success(`Pipeline complete: ${data.task_id}`);
  });

  useSSEEvent("gate:waiting", (data) => {
    toast.warning(`Approval needed: ${data.gate_name}`, {
      description: `Pipeline ${data.task_id} is waiting for review`,
    });
  });

  useSSEEvent("pipeline:update", (data) => {
    if (data.error) {
      toast.error(`Pipeline blocked: ${data.task_id}`, {
        description: String(data.error),
      });
    }
  });
}
