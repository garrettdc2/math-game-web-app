import { Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-elevated border border-border mb-6">
        <Rocket className="h-8 w-8 text-text-tertiary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        No pipelines yet
      </h2>
      <p className="max-w-sm text-sm text-text-secondary mb-6">
        Start your first pipeline to see it appear here. Each pipeline moves
        through spec, architecture, development, QA, and deploy.
      </p>
      <Button onClick={() => navigate("/new")}>
        <Rocket className="h-4 w-4" />
        New Pipeline
      </Button>
    </div>
  );
}
