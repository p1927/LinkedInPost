import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 outline-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border border-primary/20 bg-primary text-primary-fg shadow-card hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-primary",
        primary: "border border-primary/20 bg-primary text-primary-fg shadow-card hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-primary",
        secondary: "border border-violet-200/55 bg-white/80 text-ink shadow-sm backdrop-blur-md hover:border-primary/30 hover:bg-white hover:shadow-md focus-visible:outline-primary",
        ghost: "border border-transparent text-muted hover:border-violet-200/40 hover:bg-white/55 hover:text-ink focus-visible:outline-primary",
        danger: "border border-red-700/20 bg-red-600 text-primary-fg shadow-sm hover:bg-red-700 focus-visible:outline-red-600",
        destructive: "border border-red-700/20 bg-red-600 text-primary-fg shadow-sm hover:bg-red-700 focus-visible:outline-red-600",
        outline: "border-2 border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10 focus-visible:outline-primary",
        ai: "border border-ai-border bg-ai-surface text-ai-ink shadow-sm hover:border-ai-hover hover:bg-cyan-50 focus-visible:outline-cyan-600",
        ink: "border border-ink/20 bg-ink text-primary-fg shadow-sm hover:border-ink-hover hover:bg-ink-hover focus-visible:outline-deep-indigo",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2.5 text-sm rounded-xl gap-2",
        sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
        md: "px-4 py-2.5 text-sm rounded-xl gap-2",
        lg: "px-5 py-3 text-base rounded-xl gap-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
