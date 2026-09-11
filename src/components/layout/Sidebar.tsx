import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-5 dark:border-slate-800">
        <img
          src="/bgfavicon.svg"
          alt="mediaBubble"
          className="h-9 w-9 rounded-xl"
        />
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
            mediaBubble
          </p>
          <p className="text-xs font-medium leading-tight text-slate-400">
            Ops
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <img
              src="/bgfavicon.svg"
              alt="mediaBubble"
              className="h-9 w-9 rounded-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {user?.email}
            </p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
          <button
            onClick={signOut}
            title="Log out"
            aria-label="Log out"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
