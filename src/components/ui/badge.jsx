/**
 * Badge Component
 * Japanese Design: Wabi-sabi - acceptance of imperfection
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground shadow',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground',
                destructive:
                    'border-transparent bg-destructive text-destructive-foreground shadow',
                outline: 'text-foreground border-border',
                success:
                    'border-transparent bg-green-500/10 text-green-600 dark:text-green-400',
                warning:
                    'border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                info: 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400',
                // Subtle Japanese-inspired
                subtle: 'border-border/50 bg-muted/50 text-muted-foreground',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const Badge = React.forwardRef(
    ({ className, variant, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
