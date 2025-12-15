/**
 * Framer Motion Animation Library
 * Apple-inspired smooth animations with Japanese minimalism
 * Mobile-optimized, 60fps performance
 */

// Apple easing curves
export const appleEasing = {
    standard: [0.4, 0.0, 0.2, 1],
    decelerate: [0.0, 0.0, 0.2, 1],
    accelerate: [0.4, 0.0, 1, 1],
    sharp: [0.4, 0.0, 0.6, 1],
};

// Durations (Apple guidelines)
export const duration = {
    fast: 0.15,
    normal: 0.25,
    slow: 0.35,
    slower: 0.5,
};

// Fade animations
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration.normal, ease: appleEasing.standard },
};

export const fadeUp = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

export const fadeDown = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

// Scale animations (subtle, Japanese Shibui principle)
export const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: duration.normal, ease: appleEasing.standard },
};

export const scaleBounce = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
        opacity: 1,
        scale: [0.9, 1.02, 1],
    },
    transition: {
        duration: duration.slow,
        times: [0, 0.7, 1],
        ease: appleEasing.decelerate,
    },
};

// Slide animations (mobile-optimized)
export const slideInFromBottom = {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

export const slideInFromTop = {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

export const slideInFromLeft = {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

export const slideInFromRight = {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

// Stagger children (for lists)
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.02,
        },
    },
};

export const staggerItem = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: duration.normal, ease: appleEasing.decelerate },
};

// Modal/Dialog animations
export const modalOverlay = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration.fast },
};

export const modalContent = {
    initial: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    transition: {
        duration: duration.slow,
        ease: appleEasing.decelerate,
    },
};

// Mobile sheet (bottom drawer)
export const mobileSheet = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
    },
};

// Hover animations (desktop only, disabled on mobile for performance)
export const hoverScale = (isMobile = false) => ({
    whileHover: isMobile ? {} : { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: duration.fast, ease: appleEasing.sharp },
});

export const hoverGlow = (isMobile = false) => ({
    whileHover: isMobile
        ? {}
        : {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        },
    transition: { duration: duration.normal },
});

// Spinner/Loading (60fps)
export const spinnerRotate = {
    animate: {
        rotate: 360,
    },
    transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
    },
};

export const pulse = {
    animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
    },
    transition: {
        duration: 2,
        repeat: Infinity,
        ease: appleEasing.standard,
    },
};

// Gesture animations (mobile swipe)
export const swipeable = {
    drag: 'x',
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.2,
    onDragEnd: (event, info) => {
        if (Math.abs(info.offset.x) > 100) {
            // Trigger action on swipe
            return true;
        }
        return false;
    },
};

// Page transitions
export const pageTransition = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

// Notification/Toast
export const toast = {
    initial: { opacity: 0, y: -50, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -50, scale: 0.95 },
    transition: {
        type: 'spring',
        damping: 25,
        stiffness: 400,
    },
};

// Smooth height animation
export const expandHeight = {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: duration.slow, ease: appleEasing.decelerate },
};

// Utility: Check if device is mobile
export const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

// Utility: Reduce motion for accessibility
export const shouldReduceMotion = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Conditional animation (respects user preferences)
export const withReducedMotion = (animation) => {
    if (shouldReduceMotion()) {
        return {
            initial: animation.animate,
            animate: animation.animate,
            exit: animation.animate,
            transition: { duration: 0 },
        };
    }
    return animation;
};

export default {
    fadeIn,
    fadeUp,
    fadeDown,
    scaleIn,
    scaleBounce,
    slideInFromBottom,
    slideInFromTop,
    slideInFromLeft,
    slideInFromRight,
    staggerContainer,
    staggerItem,
    modalOverlay,
    modalContent,
    mobileSheet,
    hoverScale,
    hoverGlow,
    spinnerRotate,
    pulse,
    swipeable,
    pageTransition,
    toast,
    expandHeight,
    duration,
    appleEasing,
    isMobileDevice,
    shouldReduceMotion,
    withReducedMotion,
};
