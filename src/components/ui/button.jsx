/**
 * shadcn/ui Button Component with Motion
 * Inspired by Apple & Japanese Design (Kanso - Simplicity)
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]',
                outline:
                    'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]',
                ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
                link: 'text-primary underline-offset-4 hover:underline',
                // Apple-inspired glass button
                glass: 'bg-white/10 backdrop-blur-xl border border-white/20 text-foreground hover:bg-white/20 active:scale-[0.98]',
                // Japanese-inspired minimal button
                minimal: 'bg-transparent text-foreground hover:bg-foreground/5 active:scale-[0.98]',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-8 rounded-lg px-3 text-xs',
                lg: 'h-12 rounded-xl px-6 text-base',
                xl: 'h-14 rounded-2xl px-8 text-lg',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

// Motion-enhanced Button
const Button = React.forwardRef(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

// Animated Button with spring physics (Apple-style)
const MotionButton = React.forwardRef(
    ({ className, variant, size, children, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 17,
                }}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);
MotionButton.displayName = 'MotionButton';

export { Button, MotionButton, buttonVariants };
