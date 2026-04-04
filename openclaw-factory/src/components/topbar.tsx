import { useLocation } from "react-router-dom";
import { Search, Bell, User } from "lucide-react";

export function Topbar() {
  const location = useLocation();

  const getSearchPlaceholder = () => {
    if (location.pathname.startsWith("/pipeline/")) return "Search factory logs...";
    if (location.pathname === "/new") return "Search factory assets...";
    if (location.pathname === "/pipelines") return "Search pipelines...";
    return "Search pipelines...";
  };

  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/70 backdrop-blur-xl border-b border-outline-ghost">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left: Brand */}
        <span className="text-lg font-bold tracking-tighter text-primary">Precision Engine</span>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder={getSearchPlaceholder()}
              className="h-9 w-64 rounded-lg bg-surface-container-low pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant border border-outline-ghost focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Notifications */}
          <button className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <Bell className="h-4 w-4 text-on-surface-variant" />
          </button>

          {/* User */}
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
