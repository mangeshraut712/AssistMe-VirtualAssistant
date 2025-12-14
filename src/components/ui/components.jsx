/**
 * shadcn/ui Component Exports
 * 
 * Design Philosophy:
 * - Apple: Smooth animations, spring physics, attention to detail
 * - Japanese: Kanso (simplicity), Ma (space), Wabi-sabi (beauty in imperfection)
 * 
 * @example
 * import { Button, Card, Dialog, Badge } from '@/components/ui';
 */

// Core Components
export { Button, MotionButton, buttonVariants } from './button';
export { Card, MotionCard, GlassCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export { Input, MotionInput, Textarea } from './input';
export { Badge, badgeVariants } from './badge';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Separator } from './separator';

// Dialog/Modal
export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from './dialog';

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

// Motion/Animation Components
export {
    // Animation wrappers
    FadeIn,
    SlideUp,
    ScaleIn,
    StaggerContainer,
    StaggerItem,
    AnimateInView,
    HoverScale,
    Magnetic,
    TypingText,
    Shimmer,
    PulseDot,
    // Animation variants
    appleSpring,
    snappySpring,
    gentleSpring,
    fadeVariants,
    slideUpVariants,
    slideRightVariants,
    scaleVariants,
    staggerContainer,
    staggerItem,
    // Re-export AnimatePresence
    AnimatePresence,
} from './motion';

// Legacy component exports for backwards compatibility
// TODO: Migrate existing components to use new shadcn/ui components
export {
    Spinner,
    LoadingOverlay,
    Skeleton,
    SkeletonText,
    EmptyState,
    Divider,
    VisuallyHidden,
} from './index';
