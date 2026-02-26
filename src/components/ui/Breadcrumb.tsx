import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-navy transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-navy font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
