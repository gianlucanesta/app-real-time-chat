import { useState, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { cn } from "../../lib/utils";

export interface PhoneSelectOption {
  code: string;
  label: string;
}

interface PhoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: PhoneSelectOption[];
  /** "box" = rounded card style (auth / settings forms)
   *  "flat" = bottom-border only (inline contact panels) */
  variant?: "box" | "flat";
  className?: string;
}

export function PhoneSelect({
  value,
  onChange,
  options,
  variant = "box",
  className,
}: PhoneSelectProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(close);

  const selected = options.find((o) => o.code === value);

  if (variant === "flat") {
    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "flex items-center gap-1 w-full bg-transparent text-text-main px-0 py-1.5 border-b text-[15px] transition-colors focus:outline-none cursor-pointer",
            open ? "border-accent" : "border-border hover:border-accent/60",
          )}
        >
          <span className="flex-1 text-left">{selected?.code ?? value}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-text-secondary transition-transform duration-200 flex-shrink-0",
              open && "rotate-180",
            )}
          />
        </button>

        <div
          role="listbox"
          className={cn(
            "absolute z-50 left-0 mt-1.5 bg-card border border-border rounded-[10px] shadow-xl overflow-hidden transition-all duration-150 origin-top",
            open
              ? "opacity-100 scale-y-100 pointer-events-auto"
              : "opacity-0 scale-y-95 pointer-events-none",
          )}
          style={{ minWidth: 120 }}
        >
          <div className="overflow-y-auto max-h-[220px] py-1 scrollbar-thin scrollbar-thumb-border">
            {options.map((opt) => {
              const isSelected = opt.code === value;
              return (
                <button
                  key={opt.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between gap-3 w-full px-3 py-2 text-left text-[13px] transition-colors",
                    isSelected
                      ? "text-accent bg-accent/10 font-medium"
                      : "text-text-main hover:bg-input",
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3 h-3 text-accent flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── "box" variant (default) ── */
  return (
    <div ref={ref} className={cn("relative flex-shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center justify-between gap-1.5 w-full bg-input border rounded-[10px] text-text-main text-[14px] font-medium transition-colors focus:outline-none cursor-pointer h-[44px] px-3",
          open
            ? "border-accent"
            : "border-border hover:border-accent/50 focus-visible:border-accent",
        )}
        style={{ minWidth: 88, maxWidth: 108 }}
      >
        <span>{selected?.code ?? value}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-text-secondary transition-transform duration-200 flex-shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        role="listbox"
        className={cn(
          "absolute z-50 left-0 mt-1.5 bg-card border border-border rounded-[10px] shadow-xl overflow-hidden transition-all duration-150 origin-top",
          open
            ? "opacity-100 scale-y-100 pointer-events-auto"
            : "opacity-0 scale-y-95 pointer-events-none",
        )}
        style={{ minWidth: 118 }}
      >
        <div className="overflow-y-auto max-h-[240px] py-1 scrollbar-thin scrollbar-thumb-border">
          {options.map((opt) => {
            const isSelected = opt.code === value;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 w-full px-3 py-2.5 text-left text-[13px] transition-colors",
                  isSelected
                    ? "text-accent bg-accent/10 font-semibold"
                    : "text-text-main hover:bg-input",
                )}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
