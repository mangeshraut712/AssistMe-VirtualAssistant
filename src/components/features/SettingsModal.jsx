/**
 * Enhanced Settings Modal with Framer Motion
 * Apple-style settings with animations
 * 
 * Features:
 * - Animated modal entrance
 * - Interactive theme switcher
 * - Glass morphism backdrop
 * - Smooth transitions
 */


import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Monitor, Globe2, Palette, Server, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Animation variants
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: { duration: 0.2 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }
    })
};

// Setting Card Component
const SettingCard = ({ icon: Icon, title, description, children, index }) => (
    <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        custom={index}
        className={cn(
            'p-5 rounded-2xl border border-border bg-card/50',
            'backdrop-blur-sm space-y-4'
        )}
    >
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
        {children}
    </motion.div>
);

// Theme Button Component
const ThemeButton = ({ id, label, icon: Icon, swatch, selected, onClick }) => (
    <motion.button
        onClick={() => onClick(id)}
        className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-all',
            selected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-card hover:border-primary/30'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
    >
        <div className={cn(
            'w-full h-10 rounded-lg flex items-center justify-center text-xs font-semibold relative',
            swatch
        )}>
            {label}
            {selected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                >
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </motion.div>
            )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{id === 'system' ? 'Auto' : 'Theme'}</span>
        </div>
    </motion.button>
);

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
    if (!isOpen) return null;

    const themes = [
        { id: 'light', label: 'Light', icon: Sun, swatch: 'bg-white text-black border border-neutral-200' },
        { id: 'dark', label: 'Dark', icon: Moon, swatch: 'bg-neutral-900 text-white border border-neutral-700' },
        { id: 'system', label: 'System', icon: Monitor, swatch: 'bg-gradient-to-r from-white via-slate-300 to-neutral-900 text-black border' },
    ];

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ko', name: 'Korean' },
    ];

    return (
        <AnimatePresence>
            <motion.div
                className={cn(
                    'fixed inset-0 z-50 flex items-center justify-center px-4 py-4 sm:py-8',
                    'bg-background/60 backdrop-blur-md'
                )}
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
            >
                <motion.div
                    className={cn(
                        'w-full max-w-2xl rounded-3xl border border-border',
                        'bg-card/95 backdrop-blur-xl p-6 sm:p-8',
                        'shadow-2xl max-h-full overflow-y-auto'
                    )}
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <motion.div
                        className="flex items-start justify-between mb-6"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Customize your experience
                            </p>
                        </div>
                        <motion.button
                            onClick={onClose}
                            className={cn(
                                'rounded-full p-2.5',
                                'bg-foreground/5 hover:bg-foreground/10 transition-colors'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="h-5 w-5" />
                        </motion.button>
                    </motion.div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Language */}
                        <SettingCard
                            icon={Globe2}
                            title="Language"
                            description="Used across chat & translations"
                            index={0}
                        >
                            <select
                                id="language"
                                name="language"
                                value={settings.language}
                                onChange={(e) => onSettingsChange('language', e.target.value)}
                                className={cn(
                                    'h-11 w-full rounded-xl border border-input',
                                    'bg-background px-3 text-sm',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                                    'transition-all cursor-pointer'
                                )}
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </SettingCard>

                        {/* Theme */}
                        <SettingCard
                            icon={Palette}
                            title="Theme"
                            description="Choose your preferred look"
                            index={1}
                        >
                            <div className="grid grid-cols-3 gap-2">
                                {themes.map((theme) => (
                                    <ThemeButton
                                        key={theme.id}
                                        {...theme}
                                        selected={settings.theme === theme.id}
                                        onClick={(id) => onSettingsChange('theme', id)}
                                    />
                                ))}
                            </div>
                        </SettingCard>

                        {/* Backend URL */}
                        <SettingCard
                            icon={Server}
                            title="Backend URL"
                            description="Override API base (optional)"
                            index={2}
                        >
                            <input
                                type="text"
                                value={settings.backendUrl || ''}
                                onChange={(e) => onSettingsChange('backendUrl', e.target.value)}
                                placeholder="https://your-backend.example.com"
                                className={cn(
                                    'w-full rounded-xl border border-input',
                                    'bg-background px-4 py-3 text-sm',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                                    'transition-all placeholder:text-muted-foreground/50'
                                )}
                                autoComplete="off"
                            />
                        </SettingCard>

                        {/* Version Info */}
                        <motion.div
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            custom={3}
                            className={cn(
                                'p-5 rounded-2xl border border-border bg-muted/30',
                                'flex items-center justify-between'
                            )}
                        >
                            <div>
                                <p className="font-semibold text-sm">AssistMe</p>
                                <p className="text-xs text-muted-foreground">v3.0.0 • 2025 Edition</p>
                            </div>
                            <motion.div
                                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                Latest
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Footer */}
                    <motion.div
                        className="mt-8 flex justify-end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <motion.button
                            onClick={onClose}
                            className={cn(
                                'inline-flex items-center justify-center rounded-xl',
                                'text-sm font-semibold',
                                'bg-primary text-primary-foreground',
                                'h-11 px-8 shadow-lg shadow-primary/25'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Done
                        </motion.button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SettingsModal;
