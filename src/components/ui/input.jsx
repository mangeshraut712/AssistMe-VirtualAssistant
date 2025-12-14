/**
 * Input Component with Motion
 * Japanese Design Philosophy: Kanso (Simplicity) & Seijaku (Tranquility)
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-all duration-200',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                // Apple-style focus glow
                'focus:shadow-[0_0_0_4px_rgba(var(--ring),0.1)]',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = 'Input';

// Animated Input with focus effect
const MotionInput = React.forwardRef(({ className, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
        <motion.div
            className="relative"
            animate={{
                scale: isFocused ? 1.01 : 1,
            }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
            }}
        >
            <input
                type={type}
                className={cn(
                    'flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-all duration-200',
                    'placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            />
        </motion.div>
    );
});
MotionInput.displayName = 'MotionInput';

// Textarea with consistent styling
const Textarea = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-[120px] w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm transition-all duration-200',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-none',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Input, MotionInput, Textarea };
