import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** A fixed, non-editable chip glued to the input's trailing edge (e.g.
   * "@example.com" after a local-part-only email input). */
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, suffix, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && <span className="text-red-500"> *</span>}
          </label>
        )}
        <div className="flex">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full min-w-0 flex-1 border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
              suffix ? "rounded-l-lg border-r-0" : "rounded-lg",
              "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
              "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500",
              "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
              "dark:disabled:border-slate-800 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500",
              error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
          {suffix && (
            <span
              title={suffix}
              className="inline-flex max-w-[45%] shrink-0 items-center truncate rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
