import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-[transform,background-color,border-color,opacity,box-shadow] duration-120 ease-out active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:bg-primary/90 active:bg-primary/95 border border-primary/30",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:bg-destructive/90 active:bg-destructive/95",
        outline:
          "border border-border/80 bg-card/60 backdrop-blur-md text-foreground shadow-2xs hover:bg-accent/80 hover:text-accent-foreground hover:border-border active:bg-accent",
        secondary:
          "bg-secondary/80 text-secondary-foreground hover:bg-secondary active:bg-secondary/90 border border-border/40",
        glass:
          "bg-white/[0.06] hover:bg-white/[0.12] text-foreground border border-white/[0.12] backdrop-blur-md shadow-xs active:bg-white/[0.16]",
        ghost:
          "text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4 text-sm font-semibold",
        pill: "h-9 px-5 py-2 rounded-full",
        "pill-sm": "h-8 px-4 py-1.5 rounded-full text-xs",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
