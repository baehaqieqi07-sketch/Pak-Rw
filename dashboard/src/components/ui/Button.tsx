import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ children, className = "", variant = "primary", icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: ReactNode }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{icon}{children}</button>;
}
