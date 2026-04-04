import { Factory, Wifi, WifiOff } from "lucide-react";
import { useSSE } from "@/hooks/use-sse";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { connected } = useSSE();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
            <Factory className="h-4 w-4 text-text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Software Factory
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              connected
                ? "bg-status-done/8 text-status-done"
                : "bg-status-failed/8 text-status-failed"
            )}
          >
            {connected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {connected ? "Live" : "Disconnected"}
          </div>
        </div>
      </div>
    </header>
  );
}
