import { ArrowRight } from "lucide-react";
import type { ButtonVariant } from "@/types";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  showArrow?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-card",
  outline:
    "border-2 border-navy text-navy hover:bg-navy hover:text-white",
  ghost:
    "text-navy hover:bg-surface-light",
  white:
    "border-2 border-white text-white hover:bg-white hover:text-navy",
  cta:
    "bg-accent-yellow border-2 border-accent-yellow text-navy font-bold hover:brightness-110 shadow-md",
};

export default function Button({
  children,
  variant = "primary",
  showArrow = false,
  href,
  className = "",
  onClick,
  type = "submit",
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm transition-all duration-300 cursor-pointer";
  const classes = `${baseClasses} ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
        {showArrow && <ArrowRight className="w-4 h-4" />}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
      {showArrow && <ArrowRight className="w-4 h-4" />}
    </button>
  );
}
