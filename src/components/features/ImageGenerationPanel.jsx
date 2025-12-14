/**
 * Enhanced Image Generation Panel with Framer Motion
 * AI-Powered Creative Studio
 * 
 * Features:
 * - Animated masonry gallery
 * - Smooth image hover effects
 * - Loading shimmer animations
 * - Glass morphism design
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Download, Image as ImageIcon,
    Video, ArrowUp, Settings2, ChevronDown, Copy, ExternalLink, Check,
    Loader2, Wand2, Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Animation variants
const panelVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: { opacity: 0, scale: 0.95 }
};

const imageVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: (i) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            type: 'spring',
            stiffness: 300,
            damping: 25
        }
    }),
    exit: { opacity: 0, scale: 0.8 }
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

// Shimmer loading placeholder
const ImageSkeleton = ({ aspect = 'aspect-square' }) => (
    <div className={cn('relative rounded-xl overflow-hidden bg-muted', aspect)}>
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
    </div>
);

// Gallery Item Component
const GalleryItem = ({ item, index, onDownload, onCopyLink, onViewFull, copiedId }) => (
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
            className={cn(
                'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
                'flex flex-col justify-end p-4'
            )}
            variants={overlayVariants}
            initial="hidden"
            whileHover="visible"
        >
            <motion.div
                className="flex items-center justify-end gap-2"
                initial={{ y: 20, opacity: 0 }}
                whileHover={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <motion.button
                    onClick={() => onViewFull(item.url)}
                    className={cn(
                        'p-2.5 rounded-full',
                        'bg-white/10 hover:bg-white/20 backdrop-blur-md',
                        'border border-white/10 text-white',
                        'transition-colors'
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="View Full Size"
                >
                    <ExternalLink className="h-4 w-4" />
                </motion.button>
                <motion.button
                    onClick={() => onCopyLink(item.url, item.id)}
                    className={cn(
                        'p-2.5 rounded-full',
                        'bg-white/10 hover:bg-white/20 backdrop-blur-md',
                        'border border-white/10 text-white',
                        'transition-colors'
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Copy Link"
                >
                    {copiedId === item.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </motion.button>
                <motion.button
                    onClick={() => onDownload(item.url, item.id)}
                    className={cn(
                        'p-2.5 rounded-full',
                        'bg-white/10 hover:bg-white/20 backdrop-blur-md',
                        'border border-white/10 text-white',
                        'transition-colors'
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Download"
                >
                    <Download className="h-4 w-4" />
                </motion.button>
            </motion.div>
        </motion.div>

        {/* New Badge */}
        {item.isNew && (
            <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                    'absolute top-3 right-3 px-2.5 py-1',
                    'bg-gradient-to-r from-purple-500 to-pink-500',
                    'text-xs font-bold rounded-full text-white',
                    'shadow-lg border border-white/20'
                )}
            >
                NEW
            </motion.span>
        )}
    </motion.div>
);

// Aspect Ratio Button
const AspectButton = ({ ratio, label, selected, onClick }) => (
    <motion.button
        onClick={onClick}
        className={cn(
            'flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all',
            selected
                ? 'bg-foreground text-background border-foreground'
                : 'border-border hover:bg-foreground/5'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
    >
        {label}
    </motion.button>
);

const ImageGenerationPanel = ({ isOpen, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [mode, setMode] = useState('image');
    const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash-image');
    const [showSettings, setShowSettings] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const models = [
        { id: 'google/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
    ];

    const [gallery, setGallery] = useState([
        { id: 1, url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[2/3]' },
        { id: 2, url: 'https://images.unsplash.com/photo-1686191128892-c0557e5a4e93?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-square' },
        { id: 3, url: 'https://images.unsplash.com/photo-1675271591433-d2c5c4c3f9a3?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[3/4]' },
        { id: 4, url: 'https://images.unsplash.com/photo-1696258686454-60082b2c33e2?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[16/9]' },
        { id: 5, url: 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[4/5]' },
        { id: 6, url: 'https://images.unsplash.com/photo-1706885093476-b1e54f26d4b6?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-square' },
    ]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);

        try {
            const sizeMap = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792' };
            const aspectClassMap = { '1:1': 'aspect-square', '16:9': 'aspect-[16/9]', '9:16': 'aspect-[9/16]' };

            const response = await fetch('/api/images/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: selectedModel,
                    size: sizeMap[aspectRatio] || '1024x1024',
                    num_images: 1
                })
            });
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const newImg = {
                    id: Date.now(),
                    url: data.data[0].url || `data:image/png;base64,${data.data[0].b64_json}`,
                    aspect: aspectClassMap[aspectRatio] || 'aspect-square',
                    isNew: true
                };
                setGallery(prev => [newImg, ...prev]);
            }
        } catch (error) {
            console.error("Generation failed", error);
        } finally {
            setIsGenerating(false);
            setPrompt('');
        }
    };

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
        } catch (e) {
            console.error("Download failed", e);
            window.open(url, '_blank');
        }
    };

    const handleCopyLink = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleViewFull = (url) => {
        window.open(url, '_blank');
    };

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
                    className={cn(
                        'h-16 flex items-center justify-between px-6',
                        'bg-background/80 backdrop-blur-xl border-b border-border',
                        'sticky top-0 z-10'
                    )}
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
                            <p className="text-xs text-muted-foreground">AI Image Studio</p>
                        </div>
                    </div>
                    <motion.button
                        onClick={onClose}
                        className="p-2.5 hover:bg-muted rounded-xl transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <X className="h-5 w-5" />
                    </motion.button>
                </motion.header>

                {/* Main Content - Masonry Grid */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 max-w-7xl mx-auto pb-40">
                        {/* Loading Skeleton when generating */}
                        {isGenerating && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="break-inside-avoid"
                            >
                                <ImageSkeleton aspect={aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-[9/16]'} />
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
                                    copiedId={copiedId}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </main>

                {/* Floating Input Bar */}
                <motion.div
                    className="absolute bottom-8 left-0 right-0 px-4 flex justify-center z-20"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className={cn(
                        'w-full max-w-3xl',
                        'bg-card/90 backdrop-blur-xl border border-border',
                        'rounded-3xl p-3 shadow-2xl'
                    )}>
                        {/* Input Area */}
                        <div className="flex items-center gap-3 px-2">
                            <motion.div
                                className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full"
                                animate={isGenerating ? { rotate: 360 } : {}}
                                transition={{ duration: 2, repeat: isGenerating ? Infinity : 0, ease: 'linear' }}
                            >
                                <Sparkles className="h-5 w-5 text-purple-500" />
                            </motion.div>
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                placeholder="Describe your imagination..."
                                className={cn(
                                    'flex-1 bg-transparent border-none',
                                    'placeholder:text-muted-foreground/60',
                                    'focus:outline-none h-12 text-base'
                                )}
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
                                {isGenerating ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <ArrowUp className="h-5 w-5" />
                                )}
                            </motion.button>
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-2 pt-3 mt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                                {/* Settings Button */}
                                <div className="relative">
                                    <motion.button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                                            showSettings ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
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
                                                className={cn(
                                                    'absolute bottom-full left-0 mb-2 w-80',
                                                    'bg-card border border-border rounded-2xl p-5 shadow-xl'
                                                )}
                                            >
                                                {/* Model Selector */}
                                                <div className="mb-5">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2">
                                                        <Palette className="h-3.5 w-3.5" />
                                                        Model
                                                    </h4>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedModel}
                                                            onChange={(e) => setSelectedModel(e.target.value)}
                                                            className={cn(
                                                                'w-full bg-background border border-border rounded-xl',
                                                                'py-2.5 px-3 text-sm focus:outline-none focus:border-purple-500',
                                                                'appearance-none'
                                                            )}
                                                        >
                                                            {models.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                    </div>
                                                </div>

                                                {/* Aspect Ratio */}
                                                <div>
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                                        Aspect Ratio
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <AspectButton ratio="1:1" label="Square" selected={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')} />
                                                        <AspectButton ratio="16:9" label="Landscape" selected={aspectRatio === '16:9'} onClick={() => setAspectRatio('16:9')} />
                                                        <AspectButton ratio="9:16" label="Portrait" selected={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="h-5 w-px bg-border" />

                                {/* Mode Toggle */}
                                <motion.button
                                    onClick={() => setMode('image')}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                                        mode === 'image' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    <span>Image</span>
                                </motion.button>
                                <motion.button
                                    onClick={() => setMode('video')}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                                        mode === 'video' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Video className="h-4 w-4" />
                                    <span>Video</span>
                                </motion.button>
                            </div>

                            <div className="text-[10px] text-muted-foreground font-mono hidden md:flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                {models.find(m => m.id === selectedModel)?.name}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageGenerationPanel;
