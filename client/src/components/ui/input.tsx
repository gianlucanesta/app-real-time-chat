import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightIcon, error, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center bg-input border rounded-[8px] h-[44px] px-3 transition-colors",
          error ? "border-danger focus-within:border-danger" : "border-border focus-within:border-accent",
          className
        )}
      >
        {icon && (
          <div className="shrink-0 w-5 h-5 text-text-secondary mr-3 flex items-center justify-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className="flex h-full w-full bg-transparent text-[14px] text-text-main outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="shrink-0 w-5 h-5 text-text-secondary ml-3 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
