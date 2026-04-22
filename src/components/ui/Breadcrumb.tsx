import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  variant?: "default" | "light";
}

export default function Breadcrumb({ items, variant = "default" }: BreadcrumbProps) {
  const isLight = variant === "light";
  return (
    <nav className={`flex items-center gap-1.5 text-xs ${isLight ? "text-white" : "text-gray-400"}`}>
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className={`w-3 h-3 ${isLight ? "text-white/60" : "text-gray-300"}`} />}
          {item.href ? (
            <a href={item.href} className={`transition-colors ${isLight ? "text-white/70 hover:text-white" : "hover:text-navy"}`}>
              {item.label}
            </a>
          ) : (
            <span className={`font-semibold ${isLight ? "text-white" : "text-navy"}`}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
