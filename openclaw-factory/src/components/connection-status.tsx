import { useSSE } from "@/hooks/use-sse";

const STATUS_CONFIG = {
  connected: {
    dotClass: "bg-emerald-400",
    label: "Connected",
  },
  reconnecting: {
    dotClass: "bg-amber-400 animate-pulse",
    label: "Reconnecting",
  },
  disconnected: {
    dotClass: "bg-red-400",
    label: "Disconnected",
  },
} as const;

export function ConnectionStatus() {
  const { connectionStatus, retryCount, reconnect } = useSSE();
  const config = STATUS_CONFIG[connectionStatus];

  return (
    <div className="flex items-center gap-2 text-xs text-white/60">
      <span className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`} />
      <span>
        {config.label}
        {connectionStatus === "reconnecting" && ` (attempt ${retryCount})`}
      </span>
      {connectionStatus === "disconnected" && (
        <button
          onClick={reconnect}
          className="ml-1 rounded px-1.5 py-0.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
