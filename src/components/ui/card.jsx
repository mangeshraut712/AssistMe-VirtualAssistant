/**
 * Card Components with Motion
 * Inspired by Japanese Design (Ma - Space, Chōwa - Harmony)
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300',
            className
        )}
        {...props}
    />
));
Card.displayName = 'Card';

// Motion-enhanced Card with hover effects (Apple-style elevation)
const MotionCard = React.forwardRef(({ className, children, ...props }, ref) => (
    <motion.div
        ref={ref}
        className={cn(
            'rounded-2xl border border-border bg-card text-card-foreground shadow-sm',
            className
        )}
        whileHover={{
            y: -4,
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.15)',
        }}
        transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
        }}
        {...props}
    >
        {children}
    </motion.div>
));
MotionCard.displayName = 'MotionCard';

// Glass Card (Apple-style frosted glass)
const GlassCard = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-card-foreground shadow-xl',
            'dark:bg-black/20 dark:border-white/5',
            className
        )}
        {...props}
    />
));
GlassCard.displayName = 'GlassCard';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn('font-semibold leading-none tracking-tight', className)}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export { Card, MotionCard, GlassCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
