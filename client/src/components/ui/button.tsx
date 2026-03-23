import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "social";
  size?: "default" | "sm" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-accent text-white hover:brightness-110 active:scale-[0.98]": variant === "default",
            "border border-border bg-transparent text-text-secondary hover:border-text-secondary hover:text-text-main": variant === "outline",
            "bg-input border border-border text-text-main hover:border-text-secondary hover:bg-border": variant === "social",
            "hover:bg-input hover:text-text-main text-text-secondary": variant === "ghost",
            "h-[44px] px-6 py-3 w-full": size === "default",
            "h-auto px-5 py-2 text-[13px]": size === "sm",
            "h-8 w-8 rounded-md": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
