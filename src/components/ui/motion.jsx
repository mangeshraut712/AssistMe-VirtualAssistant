/**
 * Animation Components & Utilities
 * Apple-style Motion with Japanese Design Philosophy
 * 
 * Design Principles:
 * - Ma (間) - Negative space and breathing room
 * - Kanso (簡素) - Simplicity and elimination of clutter
 * - Fukinsei (不均整) - Asymmetry and irregularity
 * - Shizen (自然) - Naturalness, effortless
 */

import * as React from 'react';
import { motion, AnimatePresence, useInView, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

// Default spring physics (Apple-style)
export const appleSpring = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
};

// Snappy spring (interaction feedback)
export const snappySpring = {
    type: 'spring',
    stiffness: 400,
    damping: 17,
};

// Gentle spring (subtle movements)
export const gentleSpring = {
    type: 'spring',
    stiffness: 200,
    damping: 25,
};

// Fade variants
export const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

// Slide up variants (common for modals, toasts)
export const slideUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
};

// Slide from right (sidebars, drawers)
export const slideRightVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
};

// Scale variants (buttons, cards)
export const scaleVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

// Stagger children animation
export const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
};

/**
 * Fade In component - Simple opacity animation
 */
export const FadeIn = React.forwardRef(
    ({ children, className, delay = 0, duration = 0.3, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, delay }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
);
FadeIn.displayName = 'FadeIn';

/**
 * Slide Up component - Content slides in from bottom
 */
export const SlideUp = React.forwardRef(
    ({ children, className, delay = 0, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ ...appleSpring, delay }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
);
SlideUp.displayName = 'SlideUp';

/**
 * Scale In component - Content scales in
 */
export const ScaleIn = React.forwardRef(
    ({ children, className, delay = 0, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ ...appleSpring, delay }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
);
ScaleIn.displayName = 'ScaleIn';

/**
 * Stagger Container - For animating lists of items
 */
export const StaggerContainer = React.forwardRef(
    ({ children, className, ...props }, ref) => (
        <motion.div
            ref={ref}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
);
StaggerContainer.displayName = 'StaggerContainer';

/**
 * Stagger Item - Children of StaggerContainer
 */
export const StaggerItem = React.forwardRef(
    ({ children, className, ...props }, ref) => (
        <motion.div
            ref={ref}
            variants={staggerItem}
            transition={appleSpring}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
);
StaggerItem.displayName = 'StaggerItem';

/**
 * Animate In View - Triggers animation when element enters viewport
 */
export const AnimateInView = React.forwardRef(
    ({ children, className, once = true, threshold = 0.2, ...props }, ref) => {
        const localRef = React.useRef(null);
        const isInView = useInView(localRef, { once, amount: threshold });

        return (
            <motion.div
                ref={localRef}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={appleSpring}
                className={className}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
AnimateInView.displayName = 'AnimateInView';

/**
 * Hover Scale - Interactive element with scale on hover
 */
export const HoverScale = React.forwardRef(
    ({ children, className, scale = 1.02, ...props }, ref) => (
        <motion.div
            ref={ref}
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={snappySpring}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
);
HoverScale.displayName = 'HoverScale';

/**
 * Magnetic element - Follows cursor slightly (Apple memoji effect)
 */
export const Magnetic = ({ children, className, intensity = 0.3 }) => {
    const ref = React.useRef(null);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    const handleMouse = (e) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (clientX - left - width / 2) * intensity;
        const y = (clientY - top - height / 2) * intensity;
        setPosition({ x, y });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.div
            ref={ref}
            className={className}
            onMouseMove={handleMouse}
            onMouseLeave={handleMouseLeave}
            animate={{ x: position.x, y: position.y }}
            transition={snappySpring}
        >
            {children}
        </motion.div>
    );
};

/**
 * Typing Animation - Typewriter effect for text
 */
export const TypingText = ({ text, className, speed = 0.03 }) => {
    const [displayedText, setDisplayedText] = React.useState('');

    React.useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, speed * 1000);

        return () => clearInterval(interval);
    }, [text, speed]);

    return (
        <span className={className}>
            {displayedText}
            <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
            >
                |
            </motion.span>
        </span>
    );
};

/**
 * Shimmer Loading - Apple-style loading effect
 */
export const Shimmer = ({ className, ...props }) => (
    <motion.div
        className={cn(
            'relative overflow-hidden bg-muted rounded-lg',
            className
        )}
        {...props}
    >
        <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['0%', '200%'] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    </motion.div>
);

/**
 * Pulse Dot - Live indicator
 */
export const PulseDot = ({ className, color = 'bg-green-500' }) => (
    <span className={cn('relative flex h-3 w-3', className)}>
        <span
            className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                color
            )}
        />
        <span
            className={cn('relative inline-flex rounded-full h-3 w-3', color)}
        />
    </span>
);

// Export AnimatePresence for use in other components
export { AnimatePresence };
