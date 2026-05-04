import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  CheckSquare,
  Mail,
  Calendar,
  BarChart3,
  FolderOpen,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, path: "/" },
  { key: "tasks", icon: CheckSquare, path: "/tasks" },
  { key: "emails", icon: Mail, path: "/emails" },
  { key: "calendar", icon: Calendar, path: "/calendar" },
  { key: "reports", icon: BarChart3, path: "/reports" },
  { key: "documents", icon: FolderOpen, path: "/documents" },
] as const;

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-full bg-sidebar border-r border-border px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-text-primary tracking-wide">PM System</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ key, icon: Icon, path }) => (
          <NavLink
            key={key}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cn("nav-item", isActive && "nav-item-active")
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn("nav-item mt-2 border-t border-border pt-3", isActive && "nav-item-active")
        }
      >
        <Settings className="w-4 h-4 shrink-0" />
        <span>{t("nav.settings")}</span>
      </NavLink>
    </aside>
  );
}
