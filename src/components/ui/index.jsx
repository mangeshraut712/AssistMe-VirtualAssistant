/**
 * Reusable UI Components for AssistMe Virtual Assistant
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Loading Spinner Component
 */
export const Spinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
    };

    return (
        <Loader2
            className={cn('animate-spin text-primary', sizes[size] || sizes.md, className)}
        />
    );
};

/**
 * Loading Overlay Component
 */
export const LoadingOverlay = ({ message = 'Loading...', fullScreen = true }) => (
    <div
        className={cn(
            'flex flex-col items-center justify-center gap-4',
            fullScreen
                ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50'
                : 'absolute inset-0 bg-background/60 backdrop-blur-xs'
        )}
    >
        <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-ping-slow" />
            {/* Main spinner container */}
            <div className="relative w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center shadow-elevated">
                <Spinner size="lg" />
            </div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse-subtle">{message}</p>
    </div>
);

/**
 * Skeleton Loading Component
 */
export const Skeleton = ({ className = '', variant = 'rectangle' }) => {
    const variants = {
        rectangle: 'rounded-md',
        circle: 'rounded-full',
        text: 'rounded h-4',
    };

    return (
        <div
            className={cn('skeleton', variants[variant] || variants.rectangle, className)}
            aria-label="Loading"
        />
    );
};

/**
 * Skeleton Text Lines
 */
export const SkeletonText = ({ lines = 3, className = '' }) => (
    <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                variant="text"
                className={i === lines - 1 ? 'w-3/4' : 'w-full'}
            />
        ))}
    </div>
);

/**
 * Avatar Component
 */
export const Avatar = ({ src, alt = 'Avatar', fallback = '', size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const [imageError, setImageError] = React.useState(false);

    const initials = fallback
        ? fallback
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '?';

    return (
        <div
            className={cn(
                'relative rounded-full overflow-hidden bg-muted flex items-center justify-center font-medium text-muted-foreground',
                sizes[size] || sizes.md,
                className
            )}
        >
            {src && !imageError ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
};

/**
 * Badge Component
 */
export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
    const variants = {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-green-500/10 text-green-600 dark:text-green-400',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        error: 'bg-red-500/10 text-red-600 dark:text-red-400',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        outline: 'border border-border text-foreground bg-transparent',
    };

    const sizes = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-sm px-2.5 py-1',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-full',
                variants[variant] || variants.default,
                sizes[size] || sizes.md,
                className
            )}
        >
            {children}
        </span>
    );
};

/**
 * Button Component
 */
export const Button = React.forwardRef(
    (
        {
            children,
            variant = 'default',
            size = 'md',
            isLoading = false,
            disabled = false,
            className = '',
            ...props
        },
        ref
    ) => {
        const variants = {
            default: 'bg-primary text-primary-foreground hover:opacity-90',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            link: 'text-primary underline-offset-4 hover:underline',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs rounded-lg',
            md: 'h-10 px-4 text-sm rounded-xl',
            lg: 'h-12 px-6 text-base rounded-xl',
            icon: 'h-10 w-10 rounded-xl',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center font-medium transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none hover-lift',
                    variants[variant] || variants.default,
                    sizes[size] || sizes.md,
                    className
                )}
                {...props}
            >
                {isLoading && <Spinner size="sm" className="mr-2" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

/**
 * Card Component
 */
export const Card = ({ children, className = '', hover = false, ...props }) => (
    <div
        className={cn(
            'rounded-2xl border border-border bg-card text-card-foreground shadow-soft',
            hover && 'transition-all hover-lift hover:shadow-elevated cursor-pointer',
            className
        )}
        {...props}
    >
        {children}
    </div>
);

export const CardHeader = ({ children, className = '' }) => (
    <div className={cn('p-6 pb-0', className)}>{children}</div>
);

export const CardTitle = ({ children, className = '' }) => (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
        {children}
    </h3>
);

export const CardDescription = ({ children, className = '' }) => (
    <p className={cn('text-sm text-muted-foreground mt-1.5', className)}>{children}</p>
);

export const CardContent = ({ children, className = '' }) => (
    <div className={cn('p-6', className)}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
    <div className={cn('p-6 pt-0 flex items-center', className)}>{children}</div>
);

/**
 * Empty State Component
 */
export const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
        {Icon && (
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
        )}
        <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
        {description && (
            <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
        )}
        {action}
    </div>
);

/**
 * Tooltip Component (Simple)
 */
export const Tooltip = ({ children, content, position = 'top' }) => {
    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div className="relative group inline-flex">
            {children}
            <div
                className={cn(
                    'absolute z-50 px-2 py-1 text-xs font-medium text-popover-foreground bg-popover border border-border rounded-lg shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap',
                    positions[position] || positions.top
                )}
                role="tooltip"
            >
                {content}
            </div>
        </div>
    );
};

/**
 * Divider Component
 */
export const Divider = ({ orientation = 'horizontal', className = '' }) => (
    <div
        className={cn(
            'bg-border',
            orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
            className
        )}
        role="separator"
    />
);

/**
 * Visually Hidden (for screen readers)
 */
export const VisuallyHidden = ({ children }) => (
    <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
        {children}
    </span>
);
