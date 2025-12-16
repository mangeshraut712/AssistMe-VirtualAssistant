/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GROKIPEDIA - AI-Powered Encyclopedia
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Real-time streaming with multiple AI models
 * - Model selection (Free & Premium)
 * - Wikipedia-style articles with TOC
 * - Related topics & Quick facts
 * - Search history
 * 
 * @version 2.0.0
 * @date December 2025
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, BookOpen, Clock, ChevronUp, ChevronDown, ChevronRight,
    ListOrdered, Tags, Zap, Copy, Check, Share2,
    Sparkles, TrendingUp, History, Crown, Brain
} from 'lucide-react';
import { createApiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/hooks';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Available Models for Grokipedia
const MODELS = {
    // Free Models (via OpenRouter)
    'gemini-free': {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, 1M context',
        icon: Zap,
        free: true
    },
    'qwen-free': {
        id: 'qwen/qwen3-235b-a22b:free',
        name: 'Qwen 3 235B',
        description: 'Large, research-focused',
        icon: Brain,
        free: true
    },
    'deepseek-free': {
        id: 'nex-agi/deepseek-v3.1-nex-n1:free',
        name: 'DeepSeek V3.1',
        description: 'Reasoning model',
        icon: Sparkles,
        free: true
    },
    'deepresearch-free': {
        id: 'alibaba/tongyi-deepresearch-30b-a3b:free',
        name: 'Deep Research',
        description: 'Research optimized',
        icon: BookOpen,
        free: true
    },
    // Premium Models
    'grok-fast': {
        id: 'x-ai/grok-4.1-fast',
        name: 'Grok 4.1 Fast',
        description: '2M context (Premium)',
        icon: Crown,
        free: false
    },
    'grok-4': {
        id: 'x-ai/grok-4',
        name: 'Grok 4',
        description: 'Most capable (Premium)',
        icon: Crown,
        free: false
    }
};

// Default model
const DEFAULT_MODEL = 'gemini-free';

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const panelVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: { duration: 0.2 }
    }
};

const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
};

const tocItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }
    })
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Skeleton = ({ className }) => (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
);

const TocItem = ({ item, isActive, onClick }) => (
    <motion.button
        variants={tocItemVariants}
        initial="hidden"
        animate="visible"
        onClick={onClick}
        className={cn(
            'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
            'flex items-center gap-2',
            isActive
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
    >
        <ChevronRight className={cn('h-3 w-3 transition-transform', isActive && 'rotate-90 text-purple-500')} />
        <span className="truncate">{item.title}</span>
    </motion.button>
);

const QuickFact = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-purple-500 shrink-0" />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{value}</span>
    </div>
);

const RelatedTopic = ({ topic, onClick }) => (
    <motion.button
        onClick={() => onClick(topic)}
        className="px-3 py-1.5 text-sm bg-muted hover:bg-purple-500/10 rounded-full transition-colors text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
    >
        {topic}
    </motion.button>
);

// Model Selector
const ModelSelector = ({ selectedModel, onSelect, isOpen, onToggle }) => (
    <div className="relative">
        <motion.button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {(() => {
                const ModelIcon = MODELS[selectedModel]?.icon || Zap;
                return <ModelIcon className={cn('h-4 w-4', MODELS[selectedModel]?.free ? 'text-green-500' : 'text-yellow-500')} />;
            })()}
            <span className="font-medium">{MODELS[selectedModel]?.name || 'Select Model'}</span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        </motion.button>

        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 right-0 w-72 bg-card border border-border rounded-xl shadow-xl p-2 z-50"
                >
                    <div className="text-xs text-muted-foreground font-semibold uppercase px-2 py-1 mb-1">Free Models</div>
                    {Object.entries(MODELS).filter(([_, m]) => m.free).map(([key, model]) => (
                        <button
                            key={key}
                            onClick={() => { onSelect(key); onToggle(); }}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                                selectedModel === key
                                    ? 'bg-purple-500/10 text-purple-600'
                                    : 'hover:bg-muted'
                            )}
                        >
                            <model.icon className="h-4 w-4 text-green-500" />
                            <div className="flex-1">
                                <div className="font-medium text-sm">{model.name}</div>
                                <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 rounded">FREE</span>
                        </button>
                    ))}

                    <div className="text-xs text-muted-foreground font-semibold uppercase px-2 py-1 mt-2 mb-1">Premium Models</div>
                    {Object.entries(MODELS).filter(([_, m]) => !m.free).map(([key, model]) => (
                        <button
                            key={key}
                            onClick={() => { onSelect(key); onToggle(); }}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                                selectedModel === key
                                    ? 'bg-purple-500/10 text-purple-600'
                                    : 'hover:bg-muted'
                            )}
                        >
                            <model.icon className="h-4 w-4 text-yellow-500" />
                            <div className="flex-1">
                                <div className="font-medium text-sm">{model.name}</div>
                                <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 rounded">PRO</span>
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

// Trending topics
const TRENDING_TOPICS = [
    "Artificial Intelligence",
    "Climate Change",
    "Quantum Computing",
    "Space Exploration",
    "Cryptocurrency",
    "Machine Learning",
    "Renewable Energy",
    "Biotechnology"
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const GrokipediaPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [article, setArticle] = useState(null);
    const [toc, setToc] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [isTocExpanded, setIsTocExpanded] = useState(true);
    const [relatedTopics, setRelatedTopics] = useState([]);
    const [quickFacts, setQuickFacts] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedModel, setSelectedModel] = useLocalStorage('grokipedia_model', DEFAULT_MODEL);
    const [showModelSelector, setShowModelSelector] = useState(false);

    const contentRef = useRef(null);
    const searchInputRef = useRef(null);

    // Load search history
    useEffect(() => {
        const saved = localStorage.getItem('grokipedia-history');
        if (saved) setSearchHistory(JSON.parse(saved));
    }, []);

    // Save search to history
    const saveToHistory = useCallback((term) => {
        const updated = [term, ...searchHistory.filter(t => t !== term)].slice(0, 10);
        setSearchHistory(updated);
        localStorage.setItem('grokipedia-history', JSON.stringify(updated));
    }, [searchHistory]);

    // Scroll handler
    useEffect(() => {
        const handleScroll = () => {
            if (contentRef.current) {
                setShowScrollTop(contentRef.current.scrollTop > 300);
            }
        };
        const ref = contentRef.current;
        ref?.addEventListener('scroll', handleScroll);
        return () => ref?.removeEventListener('scroll', handleScroll);
    }, []);

    // Calculate reading time
    const getReadingTime = (content) => {
        if (!content) return 0;
        const words = content.split(/\s+/).length;
        return Math.ceil(words / 200);
    };

    // Enhanced search with better prompts
    const handleSearch = async (searchQuery = searchTerm) => {
        const term = searchQuery.trim();
        if (!term) return;

        setIsSearching(true);
        setArticle(null);
        setToc([]);
        setRelatedTopics([]);
        setQuickFacts(null);
        saveToHistory(term);

        try {
            let accumulatedContent = '';
            const api = createApiClient({ baseUrl: backendUrl });
            const modelConfig = MODELS[selectedModel] || MODELS[DEFAULT_MODEL];

            setArticle({
                title: term,
                content: '',
                lastUpdated: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                sources: [],
                model: modelConfig.name
            });

            await api.streamChat({
                model: modelConfig.id,
                messages: [
                    {
                        role: 'system',
                        content: `You are Grokipedia, a comprehensive AI-powered encyclopedia. Create detailed, Wikipedia-quality articles.

ARTICLE STRUCTURE (use exactly this format):
## Overview
Brief introduction explaining what the topic is.

## History
Historical background and evolution.

## Key Concepts
Main ideas, principles, or components.

## How It Works
Technical or practical details (if applicable).

## Applications
Real-world uses and implementations.

## Impact & Significance
Why this topic matters.

## Challenges & Criticisms
Known issues or debates.

## Future Outlook
Predictions and emerging trends.

## Related Topics
List 5-8 related topics the reader might explore.

WRITING GUIDELINES:
- Be factual, comprehensive, and educational
- Use clear, accessible language
- Include specific facts, dates, and statistics where relevant
- Maintain neutral, encyclopedic tone
- Use bold for key terms
- Include subsections (###) for complex topics`
                    },
                    { role: 'user', content: `Write a comprehensive encyclopedia article about: ${term}` }
                ],
                onDelta: (delta) => {
                    accumulatedContent += delta;
                    setArticle(prev => prev ? ({ ...prev, content: accumulatedContent }) : ({
                        title: term,
                        content: accumulatedContent,
                        lastUpdated: new Date().toLocaleDateString(),
                        sources: [],
                        model: modelConfig.name
                    }));
                },
                onError: (err) => {
                    throw new Error(typeof err === 'string' ? err : err?.message || 'Unknown error');
                }
            });

            // Parse TOC and related topics
            setToc(parseToc(accumulatedContent));
            setRelatedTopics(parseRelatedTopics(accumulatedContent));

            // Extract quick facts
            extractQuickFacts(term, accumulatedContent);

        } catch (error) {
            console.error('Search failed:', error);
            setArticle(prev => prev ? {
                ...prev,
                content: prev.content + '\n\n> ⚠️ Connection interrupted. Please try again.'
            } : null);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle keyboard search
    const handleKeySearch = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    // Parse table of contents from markdown
    const parseToc = (markdown) => {
        const headings = markdown.match(/^##\s+(.+)$/gm) || [];
        return headings.map((heading) => {
            const title = heading.replace(/^##\s+/, '');
            const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return { id, title, level: 2 };
        });
    };

    // Parse related topics from article
    const parseRelatedTopics = (markdown) => {
        const match = markdown.match(/##\s*Related Topics[\s\S]*?(?=##|$)/i);
        if (!match) return [];
        const items = match[0].match(/[-•]\s*(.+)/g) || [];
        return items.slice(0, 8).map(item =>
            item.replace(/^[-•]\s*/, '').replace(/\*\*/g, '').trim()
        );
    };

    // Extract quick facts
    const extractQuickFacts = (topic, content) => {
        const readTime = getReadingTime(content);
        const sectionCount = (content.match(/^##\s+/gm) || []).length;
        setQuickFacts({
            readTime: `${readTime} min read`,
            sections: sectionCount,
            topic: topic
        });
    };

    // Scroll to section
    const scrollToSection = (id) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element && contentRef.current) {
            contentRef.current.scrollTo({
                top: element.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    };

    // Scroll to top
    const scrollToTop = () => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Render markdown safely
    const renderMarkdown = (content) => {
        if (!content) return '';

        return content
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-foreground">$1</h3>')
            .replace(/^## (.+)$/gm, (match, p1) => {
                const id = p1.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return `<h2 id="${id}" class="text-xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2">${p1}</h2>`;
            })
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
            .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc mb-4">$&</ul>')
            .replace(/\n\n/g, '</p><p class="mb-4 text-muted-foreground leading-relaxed">')
            .replace(/^(?!<)(.+)$/gm, '<p class="mb-4 text-muted-foreground leading-relaxed">$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/> (.+)/g, '<blockquote class="border-l-4 border-purple-500 pl-4 my-4 italic text-muted-foreground">$1</blockquote>');
    };

    // Copy article content
    const handleCopy = async () => {
        if (!article?.content) return;
        await navigator.clipboard.writeText(article.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Share article
    const handleShare = async () => {
        if (!article) return;
        try {
            await navigator.share({
                title: `Grokipedia: ${article.title}`,
                text: article.content.substring(0, 200) + '...'
            });
        } catch {
            handleCopy();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background z-50 flex flex-col"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <BookOpen className="h-5 w-5 text-purple-500" />
                        </motion.div>
                        <div>
                            <h1 className="font-bold text-lg">Grokipedia</h1>
                            <p className="text-xs text-muted-foreground">AI-Powered Encyclopedia</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Model Selector */}
                        <ModelSelector
                            selectedModel={selectedModel}
                            onSelect={setSelectedModel}
                            isOpen={showModelSelector}
                            onToggle={() => setShowModelSelector(!showModelSelector)}
                        />

                        <motion.button
                            onClick={onClose}
                            className="p-2.5 hover:bg-muted rounded-xl transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="h-5 w-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Table of Contents - Desktop */}
                    {article && toc.length > 0 && (
                        <motion.aside
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="hidden lg:block w-64 border-r border-border p-4 overflow-y-auto"
                        >
                            <div className="sticky top-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <ListOrdered className="h-4 w-4 text-purple-500" />
                                        <span>Contents</span>
                                    </div>
                                    <button
                                        onClick={() => setIsTocExpanded(!isTocExpanded)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        {isTocExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {isTocExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-1"
                                        >
                                            {toc.map((item, index) => (
                                                <TocItem
                                                    key={item.id}
                                                    item={item}
                                                    index={index}
                                                    isActive={activeSection === item.id}
                                                    onClick={() => scrollToSection(item.id)}
                                                    isExpanded={isTocExpanded}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Quick Facts */}
                                {quickFacts && (
                                    <div className="mt-6 pt-4 border-t border-border space-y-3">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-purple-500" />
                                            Quick Facts
                                        </h3>
                                        <QuickFact label="Reading time" value={quickFacts.readTime} icon={Clock} />
                                        <QuickFact label="Sections" value={quickFacts.sections} icon={ListOrdered} />
                                    </div>
                                )}
                            </div>
                        </motion.aside>
                    )}

                    {/* Article Content */}
                    <main ref={contentRef} className="flex-1 overflow-y-auto">
                        <div className="max-w-4xl mx-auto p-4 md:p-8">

                            {/* Search Box */}
                            <motion.div
                                className="mb-8"
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                            >
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={handleKeySearch}
                                        onFocus={() => setShowHistory(true)}
                                        onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                                        placeholder="Search for any topic..."
                                        className="w-full h-14 pl-12 pr-4 bg-muted border border-border rounded-2xl text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Search History Dropdown */}
                                <AnimatePresence>
                                    {showHistory && searchHistory.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute z-20 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                                        >
                                            <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
                                                <History className="h-4 w-4" />
                                                <span>Recent Searches</span>
                                            </div>
                                            {searchHistory.map((term, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSearchTerm(term); handleSearch(term); }}
                                                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                                                >
                                                    {term}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Trending Topics (when no article) */}
                            {!article && !isSearching && (
                                <motion.div
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="text-center"
                                >
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6"
                                    >
                                        <Sparkles className="h-12 w-12 text-purple-500" />
                                    </motion.div>

                                    <h2 className="text-2xl font-bold mb-2">Explore Knowledge</h2>
                                    <p className="text-muted-foreground mb-8">Search any topic to get a comprehensive AI-generated article</p>

                                    <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                                        <TrendingUp className="h-4 w-4 text-purple-500" />
                                        <span>Trending Topics</span>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-2">
                                        {TRENDING_TOPICS.map((topic, i) => (
                                            <motion.button
                                                key={topic}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => { setSearchTerm(topic); handleSearch(topic); }}
                                                className="px-4 py-2 bg-muted hover:bg-purple-500/10 rounded-full text-sm transition-colors"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                {topic}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Loading State */}
                            {isSearching && !article?.content && (
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-3/4" />
                                    <Skeleton className="h-4 w-1/4" />
                                    <div className="space-y-2 mt-8">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                </div>
                            )}

                            {/* Article */}
                            {article && (
                                <motion.article
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {/* Article Header */}
                                    <header className="mb-8">
                                        <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {article.lastUpdated}
                                            </span>
                                            {quickFacts && (
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="h-4 w-4" />
                                                    {quickFacts.readTime}
                                                </span>
                                            )}
                                            {article.model && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded-full">
                                                    <Sparkles className="h-3 w-3" />
                                                    {article.model}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-4">
                                            <motion.button
                                                onClick={handleCopy}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                {copied ? 'Copied!' : 'Copy'}
                                            </motion.button>
                                            <motion.button
                                                onClick={handleShare}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Share2 className="h-4 w-4" />
                                                Share
                                            </motion.button>
                                        </div>
                                    </header>

                                    {/* Article Content */}
                                    <div
                                        className="prose prose-lg dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
                                    />

                                    {/* Related Topics */}
                                    {relatedTopics.length > 0 && !isSearching && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-12 pt-8 border-t border-border"
                                        >
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <Tags className="h-5 w-5 text-purple-500" />
                                                Explore Related Topics
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {relatedTopics.map(topic => (
                                                    <RelatedTopic
                                                        key={topic}
                                                        topic={topic}
                                                        onClick={(t) => { setSearchTerm(t); handleSearch(t); }}
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.article>
                            )}
                        </div>
                    </main>
                </div>

                {/* Scroll to Top Button */}
                <AnimatePresence>
                    {showScrollTop && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={scrollToTop}
                            className="fixed bottom-6 right-6 p-3 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <ChevronUp className="h-5 w-5" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

export default GrokipediaPanel;
