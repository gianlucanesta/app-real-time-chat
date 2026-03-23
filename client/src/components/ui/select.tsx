import { useState, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
}

export function Select({ options, value, onChange, icon, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(useCallback(() => setOpen(false), []));

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full h-11 pl-10 pr-9 rounded-lg bg-[var(--color-input)]/60 border border-[var(--color-border)]/50 text-[14px] text-[var(--color-text-main)] cursor-pointer focus:outline-none focus:border-[var(--color-accent)] transition-colors text-left flex items-center"
      >
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-secondary)]">
            {icon}
          </span>
        )}
        {selected?.label || ""}
        <ChevronDown
          className={cn(
            "w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg shadow-black/30 py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-[14px] transition-colors",
                  opt.value === value
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-main)] hover:bg-[var(--color-input)]",
                  opt.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
                )}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
