import { ExternalLink, Globe, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeployStatusProps {
  deployUrl: string;
  deployMode: string;
  deployHealth?: string | null;
}

const HEALTH_CONFIG: Record<string, { dot: string; label: string }> = {
  live: { dot: "bg-green-500", label: "Live" },
  offline: { dot: "bg-red-500", label: "Offline" },
  starting: { dot: "bg-amber-500 animate-pulse", label: "Starting" },
  unknown: { dot: "bg-gray-400", label: "Unknown" },
};

export function DeployStatus({ deployUrl, deployMode, deployHealth }: DeployStatusProps) {
  if (!deployMode && !deployUrl) {
    return (
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="h-2 w-2 rounded-full bg-outline-variant animate-pulse" />
        Deploy pending
      </div>
    );
  }

  const isLocal = deployMode === "local";
  const healthKey = deployHealth || "unknown";
  const health = HEALTH_CONFIG[healthKey] || HEALTH_CONFIG.unknown;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isLocal ? (
          <HardDrive className="h-4 w-4 text-amber-500" />
        ) : (
          <Globe className="h-4 w-4 text-primary" />
        )}
        <Badge variant={isLocal ? "waiting" : "done"}>
          {isLocal ? "Local" : "Cloud"}
        </Badge>
        {isLocal && deployUrl && (
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${health.dot}`} />
            <span className="text-xs text-on-surface-variant">{health.label}</span>
          </div>
        )}
      </div>
      {deployUrl && (
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-mono"
        >
          {deployUrl}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
