import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  title: string;
  description?: string;
  onOpenMobileNav: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, description, onOpenMobileNav, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <button
        onClick={onOpenMobileNav}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {description && (
          <p className="hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
            {description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
