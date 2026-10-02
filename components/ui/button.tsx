import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import type { ReactElement } from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm leading-none font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-foreground aria-invalid:ring-3 aria-invalid:ring-foreground/20",
  {
    variants: {
      variant: {
        outline:
          "border-border bg-background hover:bg-foreground/5 hover:text-foreground aria-expanded:bg-foreground/5 aria-expanded:text-foreground",
      },
      size: {
        xs: "h-6 gap-1 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "xs",
    },
  }
)

function Button({
  className,
  variant = "outline",
  size = "xs",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>): ReactElement {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
