/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMAGINE - AI Image Generation Studio
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Multiple Gemini & Imagen models (Free + Premium)
 * - Animated masonry gallery
 * - Style presets for quick generation
 * - Smooth hover effects & loading animations
 * - Glass morphism design
 * 
 * @version 2.0.0
 * @date December 2025
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Download, Image as ImageIcon,
    ArrowUp, Settings2, ChevronDown, Copy, ExternalLink, Check,
    Loader2, Wand2, Palette, Zap, Crown, RefreshCw, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Available Models
const MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & Free (500/day)', icon: Zap, free: true },
    { id: 'gemini-flash', name: 'Gemini Flash Exp', description: 'Experimental Free', icon: Sparkles, free: true },
    { id: 'gemini-3-pro', name: 'Gemini 3 Pro', description: 'Highest Quality', icon: Crown, free: true },
    { id: 'imagen-4', name: 'Imagen 4', description: 'Premium Quality', icon: Crown, free: false },
    { id: 'imagen-4-fast', name: 'Imagen 4 Fast', description: 'Fast Premium', icon: Zap, free: false },
];

// Style Presets
const STYLE_PRESETS = [
    { id: 'none', name: 'None', emoji: '✨' },
    { id: 'photorealistic', name: 'Photo', emoji: '📷' },
    { id: 'digital-art', name: 'Digital Art', emoji: '🎨' },
    { id: 'anime', name: 'Anime', emoji: '🌸' },
    { id: 'oil-painting', name: 'Oil Paint', emoji: '🖼️' },
    { id: '3d-render', name: '3D Render', emoji: '🎮' },
    { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
    { id: 'minimalist', name: 'Minimal', emoji: '⬜' },
];

// Aspect Ratios
const ASPECT_RATIOS = [
    { id: '1:1', label: 'Square', size: '1024x1024', class: 'aspect-square' },
    { id: '16:9', label: 'Landscape', size: '1792x1024', class: 'aspect-[16/9]' },
    { id: '9:16', label: 'Portrait', size: '1024x1792', class: 'aspect-[9/16]' },
    { id: '4:3', label: 'Standard', size: '1536x1152', class: 'aspect-[4/3]' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const panelVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.95 }
};

const imageVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: (i) => ({
        opacity: 1, scale: 1, y: 0,
        transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }
    }),
    exit: { opacity: 0, scale: 0.8 }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Loading Skeleton
const ImageSkeleton = ({ aspect = 'aspect-square' }) => (
    <div className={cn('relative rounded-xl overflow-hidden bg-muted', aspect)}>
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
    </div>
);

// Gallery Item
const GalleryItem = ({ item, index, onDownload, onCopyLink, onViewFull, onDelete, copiedId }) => (
    <motion.div
        layout
        variants={imageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        custom={index}
        className={cn(
            'relative group rounded-xl overflow-hidden',
            'bg-card border border-border shadow-lg',
            'break-inside-avoid cursor-pointer',
            item.aspect
        )}
        whileHover={{ y: -4 }}
    >
        <motion.img
            src={item.url}
            alt="Generated image"
            className="w-full h-full object-cover"
            loading="lazy"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6 }}
        />

        {/* Hover Overlay */}
        <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity"
        >
            {/* Prompt */}
            {item.prompt && (
                <p className="text-white/80 text-xs mb-3 line-clamp-2">{item.prompt}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
                <span className="text-white/60 text-xs">{item.model || 'Gemini'}</span>
                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onViewFull(item.url); }}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onCopyLink(item.url, item.id); }}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        {copiedId === item.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </motion.button>
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onDownload(item.url, item.id); }}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Download className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/20 text-red-400"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </motion.button>
                </div>
            </div>
        </motion.div>

        {/* New Badge */}
        {item.isNew && (
            <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold rounded-full text-white shadow-lg"
            >
                NEW
            </motion.span>
        )}
    </motion.div>
);

// Style Preset Button
const StyleButton = ({ style, selected, onClick }) => (
    <motion.button
        onClick={onClick}
        className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all min-w-[60px]',
            selected
                ? 'bg-purple-500/20 border-purple-500 text-purple-500'
                : 'border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
    >
        <span className="text-lg">{style.emoji}</span>
        <span className="text-[10px] font-medium">{style.name}</span>
    </motion.button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ImageGenerationPanel = ({ isOpen, onClose }) => {
    // State
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('none');
    const [showSettings, setShowSettings] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [error, setError] = useState(null);
    const [gallery, setGallery] = useState([]);

    // Get aspect class
    const getAspectClass = (ratio) => {
        const ar = ASPECT_RATIOS.find(a => a.id === ratio);
        return ar?.class || 'aspect-square';
    };

    // Generate Image
    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setError(null);

        try {
            const aspectConfig = ASPECT_RATIOS.find(a => a.id === aspectRatio);

            const response = await fetch('/api/images/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: selectedModel,
                    size: aspectConfig?.size || '1024x1024',
                    style: style !== 'none' ? style : null,
                    num_images: 1
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Generation failed');
            }

            if (data.data && data.data.length > 0) {
                const newImages = data.data.map((img, i) => ({
                    id: Date.now() + i,
                    url: img.url,
                    aspect: getAspectClass(aspectRatio),
                    prompt: prompt,
                    model: MODELS.find(m => m.id === selectedModel)?.name || 'Gemini',
                    isNew: true
                }));
                setGallery(prev => [...newImages, ...prev]);
            }
        } catch (e) {
            console.error('[Imagine] Error:', e);
            setError(e.message);
        } finally {
            setIsGenerating(false);
            setPrompt('');
        }
    };

    // Download Image
    const handleDownload = async (url, id) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `imagine-${id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(url, '_blank');
        }
    };

    // Copy Link
    const handleCopyLink = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // View Full
    const handleViewFull = (url) => window.open(url, '_blank');

    // Delete Image
    const handleDelete = (id) => {
        setGallery(prev => prev.filter(img => img.id !== id));
    };

    // Clear New badges after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setGallery(prev => prev.map(img => ({ ...img, isNew: false })));
        }, 5000);
        return () => clearTimeout(timer);
    }, [gallery.length]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Header */}
                <motion.header
                    className="h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-10"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <Wand2 className="h-5 w-5 text-purple-500" />
                        </motion.div>
                        <div>
                            <h1 className="font-bold text-lg">Imagine</h1>
                            <p className="text-xs text-muted-foreground">AI Image Studio • Gemini</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {gallery.length > 0 && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                {gallery.length} images
                            </span>
                        )}
                        <motion.button
                            onClick={onClose}
                            className="p-2.5 hover:bg-muted rounded-xl transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="h-5 w-5" />
                        </motion.button>
                    </div>
                </motion.header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
                    {/* Empty State */}
                    {gallery.length === 0 && !isGenerating && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center px-4"
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6"
                            >
                                <Sparkles className="h-12 w-12 text-purple-500" />
                            </motion.div>
                            <h2 className="text-2xl font-bold mb-2">Start Creating</h2>
                            <p className="text-muted-foreground max-w-md">
                                Describe what you want to create and AI will generate stunning images for you.
                            </p>
                        </motion.div>
                    )}

                    {/* Gallery Grid */}
                    {(gallery.length > 0 || isGenerating) && (
                        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 max-w-7xl mx-auto pb-48">
                            {isGenerating && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="break-inside-avoid"
                                >
                                    <ImageSkeleton aspect={getAspectClass(aspectRatio)} />
                                </motion.div>
                            )}

                            <AnimatePresence>
                                {gallery.map((item, index) => (
                                    <GalleryItem
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        onDownload={handleDownload}
                                        onCopyLink={handleCopyLink}
                                        onViewFull={handleViewFull}
                                        onDelete={handleDelete}
                                        copiedId={copiedId}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </main>

                {/* Floating Input Bar */}
                <motion.div
                    className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-20"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="w-full max-w-3xl bg-card/95 backdrop-blur-xl border border-border rounded-3xl p-4 shadow-2xl">
                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-2"
                            >
                                <span>⚠️ {error}</span>
                                <button onClick={() => setError(null)} className="ml-auto hover:text-red-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        )}

                        {/* Style Presets */}
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-border/50 scrollbar-hide">
                            {STYLE_PRESETS.map(s => (
                                <StyleButton
                                    key={s.id}
                                    style={s}
                                    selected={style === s.id}
                                    onClick={() => setStyle(s.id)}
                                />
                            ))}
                        </div>

                        {/* Input Row */}
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full"
                                animate={isGenerating ? { rotate: 360 } : {}}
                                transition={{ duration: 2, repeat: isGenerating ? Infinity : 0, ease: 'linear' }}
                            >
                                {isGenerating ? (
                                    <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                                ) : (
                                    <Sparkles className="h-5 w-5 text-purple-500" />
                                )}
                            </motion.div>

                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                placeholder="Describe your imagination..."
                                className="flex-1 bg-transparent border-none placeholder:text-muted-foreground/60 focus:outline-none h-12 text-base"
                                disabled={isGenerating}
                                autoFocus
                            />

                            <motion.button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isGenerating}
                                className={cn(
                                    'p-3 rounded-xl transition-all',
                                    prompt.trim()
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                        : 'bg-muted text-muted-foreground'
                                )}
                                whileHover={prompt.trim() ? { scale: 1.05 } : {}}
                                whileTap={prompt.trim() ? { scale: 0.95 } : {}}
                            >
                                <ArrowUp className="h-5 w-5" />
                            </motion.button>
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                            <div className="flex items-center gap-2">
                                {/* Settings */}
                                <div className="relative">
                                    <motion.button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                                            showSettings ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        )}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Settings2 className="h-4 w-4" />
                                        <span>Settings</span>
                                    </motion.button>

                                    {/* Settings Popover */}
                                    <AnimatePresence>
                                        {showSettings && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-2 w-80 bg-card border border-border rounded-2xl p-5 shadow-xl"
                                            >
                                                {/* Model */}
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Model</h4>
                                                    <div className="space-y-2">
                                                        {MODELS.map(m => (
                                                            <button
                                                                key={m.id}
                                                                onClick={() => setSelectedModel(m.id)}
                                                                className={cn(
                                                                    'w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left',
                                                                    selectedModel === m.id
                                                                        ? 'bg-purple-500/10 border-purple-500'
                                                                        : 'border-border/50 hover:bg-muted'
                                                                )}
                                                            >
                                                                <m.icon className={cn('h-4 w-4', m.free ? 'text-green-500' : 'text-yellow-500')} />
                                                                <div className="flex-1">
                                                                    <div className="text-sm font-medium">{m.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{m.description}</div>
                                                                </div>
                                                                {!m.free && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 rounded">PRO</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Aspect Ratio */}
                                                <div>
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Aspect Ratio</h4>
                                                    <div className="flex gap-2">
                                                        {ASPECT_RATIOS.map(ar => (
                                                            <button
                                                                key={ar.id}
                                                                onClick={() => setAspectRatio(ar.id)}
                                                                className={cn(
                                                                    'flex-1 py-2 rounded-xl border text-xs font-medium transition-all',
                                                                    aspectRatio === ar.id
                                                                        ? 'bg-foreground text-background border-foreground'
                                                                        : 'border-border/50 hover:bg-muted'
                                                                )}
                                                            >
                                                                {ar.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Model Badge */}
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                {MODELS.find(m => m.id === selectedModel)?.name}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageGenerationPanel;
