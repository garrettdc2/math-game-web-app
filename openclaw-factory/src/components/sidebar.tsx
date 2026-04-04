import { NavLink, useNavigate } from "react-router-dom";
import {
  Factory,
  LayoutDashboard,
  GitBranch,
  FilePlus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard Home", icon: LayoutDashboard, path: "/" },
  { label: "Pipeline Management", icon: GitBranch, path: "/pipelines" },
  { label: "Create New Spec", icon: FilePlus, path: "/new" },
];

export function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="w-64 min-h-screen bg-surface-container flex flex-col">
      {/* Logo / Header */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Factory className="h-5 w-5 text-on-primary" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase block">
              Precision
            </span>
            <span className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase block -mt-0.5">
              Engine
            </span>
            <span className="text-[9px] text-on-surface-variant/60 font-mono">
              V2.4.0-SENTINEL
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2 flex-1">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom CTA */}
      <div className="p-4">
        <Button
          className="w-full"
          onClick={() => navigate("/new")}
        >
          <Plus className="h-4 w-4" />
          New Pipeline
        </Button>
      </div>
    </aside>
  );
}
