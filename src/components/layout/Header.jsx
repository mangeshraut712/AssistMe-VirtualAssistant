/**
 * Enhanced Header Component with Framer Motion
 * Apple-style blur and subtle animations
 */


import { motion } from 'framer-motion';
import { Menu, Sparkles, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

const Header = ({ onOpenSidebar }) => {
    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                'fixed top-0 left-0 right-0 z-40 px-4 py-3 safe-area-top',
                'bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60',
                'border-b border-border/50'
            )}
        >
            <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
                {/* Left: Menu Button */}
                <motion.button
                    onClick={onOpenSidebar}
                    className={cn(
                        'p-2.5 -ml-1 rounded-xl',
                        'hover:bg-foreground/5 active:bg-foreground/10',
                        'transition-all text-foreground'
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </motion.button>

                {/* Center: App Title with subtle animation */}
                <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold tracking-tight text-foreground">
                            AssistMe
                        </span>
                        <motion.div
                            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Sparkles className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">AI</span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Right: Logo & Quick Actions */}
                <div className="flex items-center gap-2">
                    {/* Keyboard shortcut hint (desktop only) */}
                    <motion.div
                        className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Command className="h-3 w-3" />
                        <span className="text-[10px] font-medium">K</span>
                    </motion.div>

                    {/* Logo Button */}
                    <motion.button
                        className={cn(
                            'h-9 w-9 rounded-full overflow-hidden',
                            'ring-2 ring-background shadow-lg',
                            'hover:ring-primary/50 transition-all'
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <img
                            src="/assets/logo.png"
                            alt="AssistMe Logo"
                            className="h-full w-full object-cover bg-white dark:bg-black"
                        />
                    </motion.button>
                </div>
            </div>
        </motion.header>
    );
};

export default Header;
