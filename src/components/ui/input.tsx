import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9.5 w-full min-w-0 rounded-xl border border-white/[0.08] bg-muted/30 px-3.5 py-1 text-sm shadow-2xs transition-[border-color,box-shadow,background-color] duration-150 ease-out outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-zinc-900/40",
        "focus-visible:border-primary/80 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:bg-muted/50 dark:focus-visible:bg-zinc-900/70",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
