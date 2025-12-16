/**
 * Enhanced Unified Tools Panel with Framer Motion
 * AI Studio with Writing & Indian AI Suites
 * 
 * Features:
 * - Animated sidebar navigation
 * - Smooth tab transitions
 * - Glass morphism effects
 * - Mobile-optimized design
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Globe, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import GrammarlyQuillbotPanel from './GrammarlyQuillbotPanel';
import AI4BharatPanel from './AI4BharatPanel';

// Animation variants
const panelVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.3 }
    },
    exit: { opacity: 0 }
};

const sidebarItemVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.02, x: 4 },
    tap: { scale: 0.98 }
};

const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: {
        opacity: 0,
        x: -20,
        transition: { duration: 0.2 }
    }
};

// Suite Button Component
const SuiteButton = ({ active, onClick, icon: Icon, name, description, color }) => {
    const colorClasses = {
        indigo: {
            active: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20',
            iconActive: 'bg-indigo-100 dark:bg-indigo-900/40',
            iconInactive: 'group-hover:border-indigo-200'
        },
        orange: {
            active: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20',
            iconActive: 'bg-orange-100 dark:bg-orange-900/40',
            iconInactive: 'group-hover:border-orange-200'
        }
    };

    const styles = colorClasses[color] || colorClasses.indigo;

    return (
        <motion.button
            onClick={onClick}
            className={cn(
                'w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group',
                active
                    ? `${styles.active} font-semibold shadow-sm`
                    : 'text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm'
            )}
            variants={sidebarItemVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    'p-2.5 rounded-xl transition-colors',
                    active ? styles.iconActive : `bg-background border border-border ${styles.iconInactive}`
                )}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-[10px] opacity-70 font-normal">{description}</div>
                </div>
            </div>
            <AnimatePresence>
                {active && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

// Mobile Tab Button
const MobileTabButton = ({ active, onClick, icon: Icon, label, color }) => {
    const activeColor = color === 'indigo' ? 'text-indigo-600' : 'text-orange-600';

    return (
        <motion.button
            onClick={onClick}
            className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl flex-1 transition-colors',
                active ? activeColor : 'text-muted-foreground'
            )}
            whileTap={{ scale: 0.95 }}
        >
            <motion.div
                animate={active ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                <Icon className="h-6 w-6" />
            </motion.div>
            <span className="text-[10px] font-medium">{label}</span>
            {active && (
                <motion.div
                    layoutId="mobileIndicator"
                    className={cn(
                        'absolute -bottom-1 w-12 h-1 rounded-full',
                        color === 'indigo' ? 'bg-indigo-500' : 'bg-orange-500'
                    )}
                />
            )}
        </motion.button>
    );
};

const UnifiedToolsPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [activeSuite, setActiveSuite] = useState('writing');

    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 bg-background z-50 flex overflow-hidden"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            {/* Sidebar (Desktop) */}
            <motion.aside
                className="w-72 border-r border-border bg-muted/5 flex-col hidden md:flex"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Header */}
                <div className={cn(
                    'h-16 flex items-center px-6 border-b border-border/50',
                    'bg-background/50 backdrop-blur-sm'
                )}>
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 rounded-xl bg-primary/10 border border-primary/20"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <LayoutGrid className="h-5 w-5 text-primary" />
                        </motion.div>
                        <div>
                            <h1 className="font-bold text-lg">AI Studio</h1>
                            <p className="text-[10px] text-muted-foreground">Creative Tools</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="px-2 py-2 text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                        Suites
                    </div>
                    <SuiteButton
                        active={activeSuite === 'writing'}
                        onClick={() => setActiveSuite('writing')}
                        icon={Wand2}
                        name="Writing Studio"
                        description="Editor, Grammar, Rewrite"
                        color="indigo"
                    />
                    <SuiteButton
                        active={activeSuite === 'indian'}
                        onClick={() => setActiveSuite('indian')}
                        icon={Globe}
                        name="Indian AI Suite"
                        description="Translate, Script, Dict"
                        color="orange"
                    />
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                    <motion.button
                        onClick={onClose}
                        className={cn(
                            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                            'border border-border text-sm font-medium',
                            'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
                            'dark:hover:bg-red-900/10 dark:hover:border-red-900/30',
                            'transition-all shadow-sm'
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <X className="h-4 w-4" />
                        Close Studio
                    </motion.button>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <motion.div
                className={cn(
                    'md:hidden fixed top-0 left-0 right-0 h-14 z-[60]',
                    'bg-background/80 backdrop-blur-xl border-b border-border',
                    'flex items-center justify-between px-4'
                )}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">AI Studio</span>
                </div>
                <motion.button
                    onClick={onClose}
                    className="p-2 -mr-2 hover:bg-muted rounded-full"
                    whileTap={{ scale: 0.9 }}
                >
                    <X className="h-6 w-6" />
                </motion.button>
            </motion.div>

            {/* Mobile Tab Bar */}
            <motion.div
                className={cn(
                    'md:hidden fixed bottom-0 left-0 right-0 h-20 z-[60]',
                    'bg-background/80 backdrop-blur-xl border-t border-border',
                    'flex items-center justify-around px-4 pb-safe'
                )}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <MobileTabButton
                    active={activeSuite === 'writing'}
                    onClick={() => setActiveSuite('writing')}
                    icon={Wand2}
                    label="Writing"
                    color="indigo"
                />
                <div className="w-px h-10 bg-border/50" />
                <MobileTabButton
                    active={activeSuite === 'indian'}
                    onClick={() => setActiveSuite('indian')}
                    icon={Globe}
                    label="Indian AI"
                    color="orange"
                />
            </motion.div>

            {/* Main Content */}
            <main className="flex-1 relative pt-14 md:pt-0 pb-20 md:pb-0 h-full overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeSuite === 'writing' && (
                        <motion.div
                            key="writing"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="h-full"
                        >
                            <GrammarlyQuillbotPanel isOpen={true} isEmbedded={true} backendUrl={backendUrl} />
                        </motion.div>
                    )}
                    {activeSuite === 'indian' && (
                        <motion.div
                            key="indian"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="h-full"
                        >
                            <AI4BharatPanel isOpen={true} isEmbedded={true} backendUrl={backendUrl} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </motion.div>
    );
};

export default UnifiedToolsPanel;
