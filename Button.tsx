import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "outline" | "link";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    const base = "rounded-m px-[18px] py-3 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const styles: Record<Variant, string> = {
      primary: "bg-blue text-white hover:bg-blue-hover",
      outline: "bg-transparent border border-border-strong text-ink hover:bg-shell",
      link: "bg-transparent text-blue p-0 font-semibold",
    };
    return <button ref={ref} className={`${base} ${styles[variant]} ${className}`} {...props} />;
  }
);
Button.displayName = "Button";
