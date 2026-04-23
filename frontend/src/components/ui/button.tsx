import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-200 outline-none select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border border-primary/20 bg-primary text-primary-fg shadow-card hover:border-primary-hover hover:bg-primary-hover hover:shadow-lg focus-visible:outline-primary",
        primary: "border border-primary/20 bg-primary text-primary-fg shadow-card hover:border-primary-hover hover:bg-primary-hover hover:shadow-lg focus-visible:outline-primary",
        secondary: "border border-violet-200/55 bg-white/80 text-ink shadow-sm backdrop-blur-md hover:border-primary/40 hover:bg-white/95 hover:shadow-md hover:border-violet-300 focus-visible:outline-primary",
        ghost: "border-transparent bg-transparent text-muted hover:border-violet-200/40 hover:bg-white/55 hover:text-ink hover:shadow-sm focus-visible:outline-primary",
        danger: "border border-red-700/20 bg-red-600 text-primary-fg shadow-sm hover:bg-red-700 hover:border-red-700/40 hover:shadow-md focus-visible:outline-red-600",
        destructive: "border border-red-700/20 bg-red-600 text-primary-fg shadow-sm hover:bg-red-700 hover:border-red-700/40 hover:shadow-md focus-visible:outline-red-600",
        outline: "border-2 border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10 hover:shadow-sm focus-visible:outline-primary",
        ai: "border border-ai-border bg-ai-surface text-ai-ink shadow-sm hover:border-ai-hover hover:bg-cyan-50 hover:shadow-md focus-visible:outline-cyan-600",
        ink: "border border-ink/20 bg-ink text-primary-fg shadow-sm hover:border-ink-hover hover:bg-ink-hover hover:shadow-md focus-visible:outline-deep-indigo",
        link: "justify-start border-0 bg-transparent text-primary shadow-none hover:bg-transparent hover:shadow-none font-medium normal-case whitespace-normal underline-offset-4 hover:underline focus-visible:outline-primary",
      },
      size: {
        default: "min-h-10 px-4 py-2.5 text-sm rounded-xl gap-2",
        sm: "min-h-9 px-3 py-1.5 text-sm rounded-lg gap-1.5",
        md: "min-h-10 px-4 py-2.5 text-sm rounded-xl gap-2",
        lg: "min-h-11 px-5 py-3 text-base rounded-xl gap-2",
        /** Text-only / chip-like controls; avoids min-height fighting link or icon overrides */
        inline: "h-auto min-h-0 min-w-0 gap-1 rounded-md p-0 text-sm font-semibold",
        icon: "size-8 min-h-8 min-w-8 p-0",
        "icon-xs": "size-6 min-h-6 min-w-6 rounded-[min(var(--radius-md),10px)] p-0 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 min-h-7 min-w-7 rounded-[min(var(--radius-md),12px)] p-0 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 min-h-9 min-w-9 p-0",
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
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const resolvedSize = size ?? (variant === "link" ? "inline" : "md");
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size: resolvedSize }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
