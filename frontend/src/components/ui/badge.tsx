import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-auto w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-muted/95 text-ink hover:bg-surface-muted",
        neutral: "border-violet-200/50 bg-white/70 text-muted backdrop-blur-sm hover:bg-white/80 hover:border-violet-200/70",
        primary: "border-primary/35 bg-primary/12 text-deep-purple hover:bg-primary/18 hover:border-primary/45",
        success: "border-success-border bg-success-surface text-success-ink hover:bg-success-surface/80",
        warning: "border-amber-200/90 bg-amber-50 text-amber-950 hover:bg-amber-100 hover:border-amber-200",
        danger: "border-rose-200/90 bg-rose-50 text-rose-950 hover:bg-rose-100 hover:border-rose-200",
        destructive: "border-rose-200/90 bg-rose-50 text-rose-950 hover:bg-rose-100 hover:border-rose-200",
        info: "border-ai-border bg-ai-surface text-ai-ink hover:bg-cyan-100/50",
        pending: "border-amber-200/90 bg-amber-100 text-amber-950 hover:bg-amber-150 hover:border-amber-300",
        drafted: "border-indigo-200/95 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 hover:border-indigo-300",
        approved: "border-orange-200/90 bg-orange-50 text-orange-950 hover:bg-orange-100 hover:border-orange-300",
        published: "border-emerald-300/95 bg-emerald-100 text-emerald-950 hover:bg-emerald-150 hover:border-emerald-400",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
      },
      size: {
        default: "px-3 py-1 text-xs",
        xs: "px-2 py-0.5 text-[10px] uppercase tracking-wide",
        sm: "px-2.5 py-0.5 text-[11px] uppercase tracking-wide",
        md: "px-3 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "md",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
