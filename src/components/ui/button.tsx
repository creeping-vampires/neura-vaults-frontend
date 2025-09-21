import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default:
          "bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-border shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive border border-destructive text-destructive-foreground hover:bg-destructive/90 hover:border-destructive/90 shadow-sm hover:shadow-md",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
        secondary:
          "bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
        ghost: 
          "text-muted-foreground bg-accent/50 border border-transparent hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-foreground underline-offset-4 hover:underline border-transparent",
        gradient:
          "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 border-0 hover:scale-[1.02]",
        active:
          "bg-primary border border-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl hover:scale-[1.02]",
        glass:
          "bg-card/80 backdrop-blur-md border border-border text-foreground hover:bg-card/90 hover:shadow-lg",
        wallet:
          "bg-background border border-border text-foreground hover:bg-[#1a1919]/70 transition-all duration-300 hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-[35px] rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {children}
            {variant !== "link" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            )}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
