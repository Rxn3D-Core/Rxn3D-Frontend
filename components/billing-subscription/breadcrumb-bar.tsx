import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BillingCrumb {
  label: string
  href?: string
}

export function BreadcrumbBar({ items, className }: { items: BillingCrumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm", className)}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground/80">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
