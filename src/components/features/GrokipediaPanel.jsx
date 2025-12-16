/**
 * Grokipedia - AI-Powered Encyclopedia
 * 
 * Features:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ✓ Real-time streaming with Grok AI
 * ✓ Wikipedia-style article structure
 * ✓ Interactive Table of Contents
 * ✓ Related topics suggestions
 * ✓ Copy & Share functionality
 * ✓ Reading time estimation
 * ✓ Source citations
 * ✓ Quick facts sidebar
 * ✓ Image suggestions
 * 
 * Design: Minimalist Wikipedia + Modern Glass UI
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, Clock, BookOpen, ChevronRight, ChevronDown,
    Sparkles, ExternalLink, Copy, Check, Share2, Bookmark,
    BookmarkCheck, ArrowUp, Globe, Zap, Info, Link2,
    FileText, History, Star, TrendingUp
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { createApiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

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
        transition: { delay: i * 0.03 }
    })
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Skeleton = ({ className }) => (
    <motion.div
        className={cn('bg-muted/50 rounded animate-pulse', className)}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
    />
);

const TocItem = ({ item, index, isActive, onClick, isExpanded }) => (
    <motion.a
        href={`#${item.id}`}
        onClick={(e) => {
            e.preventDefault();
            onClick(item.id);
        }}
        className={cn(
            'block px-3 py-1.5 text-sm rounded-lg transition-all border-l-2',
            item.level === 3 ? 'pl-6 text-xs' : '',
            isActive
                ? 'bg-primary/10 text-primary font-medium border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 border-transparent'
        )}
        variants={tocItemVariants}
        initial="hidden"
        animate="visible"
        custom={index}
        whileHover={{ x: 4 }}
    >
        {item.text}
    </motion.a>
);

// Quick fact item
const QuickFact = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm font-medium truncate">{value}</div>
        </div>
    </div>
);

// Related topic chip
const RelatedTopic = ({ topic, onClick }) => (
    <motion.button
        onClick={() => onClick(topic)}
        className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-full transition-colors flex items-center gap-1"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
    >
        <ChevronRight className="h-3 w-3" />
        {topic}
    </motion.button>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GrokipediaPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [query, setQuery] = useState('');
    const [article, setArticle] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [toc, setToc] = useState([]);
    const [activeSection, setActiveSection] = useState('');
    const [copied, setCopied] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [relatedTopics, setRelatedTopics] = useState([]);
    const [quickFacts, setQuickFacts] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);
    const contentRef = useRef(null);

    // Load search history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('grokipedia-history');
        if (saved) {
            setSearchHistory(JSON.parse(saved).slice(0, 5));
        }
    }, []);

    // Save search to history
    const saveToHistory = (term) => {
        const updated = [term, ...searchHistory.filter(t => t !== term)].slice(0, 10);
        setSearchHistory(updated);
        localStorage.setItem('grokipedia-history', JSON.stringify(updated));
    };

    // Scroll detection for "back to top" button
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleScroll = () => {
            setShowScrollTop(container.scrollTop > 400);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [article]);

    // Calculate reading time
    const getReadingTime = (content) => {
        if (!content) return 0;
        const words = content.split(/\s+/).length;
        return Math.ceil(words / 200); // 200 words per minute
    };

    // Enhanced search with better prompts
    const handleSearch = async (searchQuery) => {
        const term = typeof searchQuery === 'string' ? searchQuery : query;
        if (!term.trim()) return;

        setQuery(term);
        setIsSearching(true);
        setArticle(null);
        setToc([]);
        setRelatedTopics([]);
        setQuickFacts(null);
        saveToHistory(term);

        try {
            let accumulatedContent = '';
            const api = createApiClient({ baseUrl: backendUrl });

            setArticle({
                title: term,
                content: '',
                lastUpdated: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                sources: []
            });

            await api.streamChat({
                model: 'x-ai/grok-4.1-fast',
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
                        sources: []
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
        if (e.key === 'Enter') {
            handleSearch(query);
        }
    };

    // Parse table of contents from markdown
    const parseToc = (markdown) => {
        const lines = markdown.split('\n');
        const headers = [];
        lines.forEach((line, index) => {
            if (line.startsWith('## ')) {
                const text = line.replace('## ', '').trim();
                if (text !== 'Related Topics') {
                    headers.push({ id: `section-${index}`, text, level: 2 });
                }
            } else if (line.startsWith('### ')) {
                headers.push({ id: `section-${index}`, text: line.replace('### ', '').trim(), level: 3 });
            }
        });
        return headers;
    };

    // Parse related topics from article
    const parseRelatedTopics = (markdown) => {
        const relatedMatch = markdown.match(/## Related Topics\n([\s\S]*?)(?=\n## |$)/);
        if (relatedMatch) {
            const lines = relatedMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
            return lines.map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0, 8);
        }
        return [];
    };

    // Extract quick facts (simulated - would be enhanced with more parsing)
    const extractQuickFacts = (topic, content) => {
        const wordCount = content.split(/\s+/).length;
        const sectionCount = (content.match(/^## /gm) || []).length;

        setQuickFacts({
            topic,
            wordCount,
            sections: sectionCount,
            readingTime: Math.ceil(wordCount / 200),
            lastUpdated: new Date().toLocaleDateString()
        });
    };

    // Scroll to section
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    // Scroll to top
    const scrollToTop = () => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Render markdown safely
    const renderMarkdown = (content) => {
        if (!content) return { __html: '' };

        let processedContent = content;
        toc.forEach(item => {
            const regex = new RegExp(
                `(${item.level === 2 ? '##' : '###'} ${item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                'g'
            );
            processedContent = processedContent.replace(
                regex,
                `<span id="${item.id}" class="scroll-mt-24"></span>$1`
            );
        });

        const html = marked.parse(String(processedContent ?? ''));
        const safeHtml = DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['id', 'class'],
        });
        return { __html: safeHtml };
    };

    // Copy article content
    const handleCopy = () => {
        if (article?.content) {
            navigator.clipboard.writeText(article.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Share article
    const handleShare = async () => {
        if (navigator.share && article) {
            await navigator.share({
                title: `Grokipedia: ${article.title}`,
                text: article.content.substring(0, 200) + '...',
                url: window.location.href
            });
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background z-50 flex flex-col font-sans"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Header */}
                <motion.header
                    className={cn(
                        'h-14 border-b border-border/40 flex items-center justify-between px-4 lg:px-6',
                        'bg-background/95 backdrop-blur-sm sticky top-0 z-10'
                    )}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h1 className="font-serif text-xl font-semibold tracking-tight">Grokipedia</h1>
                        </div>
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                            Powered by Grok
                        </span>
                    </div>

                    {/* Header Search (when article visible) */}
                    {article && (
                        <div className="flex-1 max-w-md mx-4 hidden md:block">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeySearch}
                                    placeholder="Search another topic..."
                                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/30 border border-transparent focus:border-primary/20 focus:ring-2 focus:ring-primary/10 text-sm transition-all outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                        {article && (
                            <>
                                <motion.button
                                    onClick={handleCopy}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors hidden sm:flex"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="Copy article"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </motion.button>
                                <motion.button
                                    onClick={() => setBookmarked(!bookmarked)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors hidden sm:flex"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="Bookmark"
                                >
                                    {bookmarked ? (
                                        <BookmarkCheck className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Bookmark className="h-4 w-4" />
                                    )}
                                </motion.button>
                            </>
                        )}
                        <motion.button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="h-5 w-5" />
                        </motion.button>
                    </div>
                </motion.header>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {article || isSearching ? (
                        <>
                            {/* TOC Sidebar */}
                            <motion.aside
                                className="hidden lg:flex flex-col w-64 border-r border-border/40 bg-background/50"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="p-4 border-b border-border/30">
                                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5" />
                                        Contents
                                    </h3>
                                </div>
                                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                                    {article ? (
                                        toc.map((item, index) => (
                                            <TocItem
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                isActive={activeSection === item.id}
                                                onClick={scrollToSection}
                                            />
                                        ))
                                    ) : (
                                        <div className="space-y-2 px-2">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Skeleton key={i} className="h-6 w-full" />
                                            ))}
                                        </div>
                                    )}
                                </nav>

                                {/* Quick Facts */}
                                {quickFacts && (
                                    <div className="p-4 border-t border-border/30 bg-muted/20">
                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                            <Info className="h-3.5 w-3.5" />
                                            Quick Facts
                                        </h4>
                                        <div className="space-y-0">
                                            <QuickFact
                                                label="Reading Time"
                                                value={`${quickFacts.readingTime} min`}
                                                icon={Clock}
                                            />
                                            <QuickFact
                                                label="Word Count"
                                                value={quickFacts.wordCount.toLocaleString()}
                                                icon={FileText}
                                            />
                                            <QuickFact
                                                label="Sections"
                                                value={quickFacts.sections}
                                                icon={BookOpen}
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.aside>

                            {/* Article Area */}
                            <main className="flex-1 overflow-y-auto scroll-smooth" ref={contentRef}>
                                <div className="max-w-3xl mx-auto px-6 py-10 md:px-10">
                                    <AnimatePresence mode="wait">
                                        {isSearching && !article?.content ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="space-y-6"
                                            >
                                                <Skeleton className="h-12 w-3/4 mb-4" />
                                                <Skeleton className="h-4 w-1/4 mb-8" />
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="space-y-3">
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-4/5" />
                                                    </div>
                                                ))}
                                            </motion.div>
                                        ) : article ? (
                                            <motion.article
                                                key="article"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="prose dark:prose-invert prose-lg max-w-none"
                                            >
                                                {/* Meta Info */}
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                                        <Sparkles className="h-3.5 w-3.5" />
                                                        <span>AI Generated</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{getReadingTime(article.content)} min read</span>
                                                    </div>
                                                    <span className="text-muted-foreground/40">•</span>
                                                    <span>{article.lastUpdated}</span>
                                                </div>

                                                {/* Title */}
                                                <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-6 text-foreground leading-tight">
                                                    {article.title}
                                                </h1>

                                                {/* Content */}
                                                <div
                                                    className="prose-headings:font-serif prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-p:leading-relaxed prose-p:text-foreground/85 prose-strong:text-foreground prose-li:text-foreground/85"
                                                    dangerouslySetInnerHTML={renderMarkdown(article.content)}
                                                />

                                                {/* Related Topics */}
                                                {relatedTopics.length > 0 && (
                                                    <motion.div
                                                        className="mt-12 pt-8 border-t border-border/50"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.5 }}
                                                    >
                                                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                            <Link2 className="h-4 w-4" />
                                                            Explore Related Topics
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {relatedTopics.map((topic, i) => (
                                                                <RelatedTopic
                                                                    key={i}
                                                                    topic={topic}
                                                                    onClick={handleSearch}
                                                                />
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </motion.article>
                                        ) : null}
                                    </AnimatePresence>
                                </div>

                                {/* Scroll to Top */}
                                <AnimatePresence>
                                    {showScrollTop && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            onClick={scrollToTop}
                                            className="fixed bottom-6 right-6 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-shadow"
                                        >
                                            <ArrowUp className="h-5 w-5" />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </main>
                        </>
                    ) : (
                        /* Landing View */
                        <motion.div
                            key="landing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center p-6"
                        >
                            <div className="w-full max-w-2xl text-center space-y-8">
                                {/* Logo */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <BookOpen className="h-10 w-10 text-primary" />
                                    </div>
                                    <h1 className="font-serif text-5xl md:text-6xl font-semibold tracking-tight">
                                        Grokipedia
                                    </h1>
                                    <p className="text-muted-foreground">
                                        AI-Powered Encyclopedia • Powered by Grok
                                    </p>
                                </motion.div>

                                {/* Search */}
                                <div className="relative max-w-xl mx-auto w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={handleKeySearch}
                                        placeholder="Search any topic..."
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-border focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 text-lg transition-all outline-none"
                                        autoFocus
                                    />
                                    <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-7 items-center gap-1 rounded-lg border bg-muted px-2.5 font-mono text-xs font-medium text-muted-foreground">
                                        Enter ⏎
                                    </kbd>
                                </div>

                                {/* Trending Topics */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <TrendingUp className="h-4 w-4" />
                                        <span>Trending Topics</span>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {TRENDING_TOPICS.map((topic, i) => (
                                            <motion.button
                                                key={topic}
                                                onClick={() => handleSearch(topic)}
                                                className="px-4 py-2 text-sm bg-muted/50 hover:bg-muted rounded-full transition-colors"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {topic}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Search History */}
                                {searchHistory.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <History className="h-4 w-4" />
                                            <span>Recent Searches</span>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {searchHistory.slice(0, 5).map((term, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSearch(term)}
                                                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-background border border-border/50 hover:border-border rounded-full transition-colors"
                                                >
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GrokipediaPanel;
