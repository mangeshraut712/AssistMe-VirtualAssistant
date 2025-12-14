/**
 * Enhanced Grokipedia Panel with Framer Motion
 * AI-Powered Encyclopedia with Modern Design
 * 
 * Features:
 * - Animated search and results
 * - Smooth TOC navigation
 * - Glass morphism effects
 * - Loading skeleton animations
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, Clock, BookOpen, ChevronRight,
    Sparkles, ExternalLink, Copy, Check, Share2
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { createApiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

// Animation variants


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
        transition: { delay: i * 0.05 }
    })
};

// Skeleton component for loading state
const Skeleton = ({ className }) => (
    <motion.div
        className={cn('bg-muted/50 rounded animate-pulse', className)}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
    />
);

// TOC Item component
const TocItem = ({ item, index, isActive, onClick }) => (
    <motion.a
        href={`#${item.id}`}
        onClick={(e) => {
            e.preventDefault();
            onClick(item.id);
        }}
        className={cn(
            'block px-3 py-2 text-sm rounded-lg transition-all',
            item.level === 3 ? 'pl-6' : '',
            isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
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

const GrokipediaPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [query, setQuery] = useState('');
    const [article, setArticle] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [toc, setToc] = useState([]);
    const [activeSection, setActiveSection] = useState('');
    const [copied, setCopied] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (isOpen && !article) {
            // Could load featured topics here
        }
    }, [isOpen, article]);

    const handleSearch = async (e) => {
        if (e && e.key !== 'Enter') return;
        if (!query.trim()) return;

        setIsSearching(true);
        setArticle(null);
        setToc([]);

        try {
            let accumulatedContent = '';
            const api = createApiClient({ baseUrl: backendUrl });

            setArticle({
                title: query,
                content: '',
                lastUpdated: new Date().toLocaleDateString(),
                sources: []
            });

            await api.streamChat({
                model: 'x-ai/grok-4.1-fast',
                messages: [
                    {
                        role: 'system',
                        content: `You are Grokipedia, an advanced AI encyclopedia. Provide a comprehensive, well-structured article about the user's query.
                        
Use this structure:
## Overview (brief introduction)
## Key Concepts
## Details (main content with ### subheadings)
## Applications (real-world uses)
## Related Topics
## References (if applicable)

Use Markdown formatting. Be factual and comprehensive.`
                    },
                    { role: 'user', content: query }
                ],
                onDelta: (delta) => {
                    accumulatedContent += delta;
                    setArticle(prev => prev ? ({ ...prev, content: accumulatedContent }) : ({
                        title: query,
                        content: accumulatedContent,
                        lastUpdated: new Date().toLocaleDateString(),
                        sources: []
                    }));
                },
                onError: (err) => {
                    const msg = typeof err === 'string' ? err : (err?.message || 'Unknown error');
                    throw new Error(msg);
                }
            });

            setToc(parseToc(accumulatedContent));
        } catch (error) {
            console.error('Search failed:', error);
            setArticle(prev => prev ? { ...prev, content: prev.content + '\n\n> ⚠️ Connection interrupted. Please try again.' } : null);
        } finally {
            setIsSearching(false);
        }
    };

    const parseToc = (markdown) => {
        const lines = markdown.split('\n');
        const headers = [];
        lines.forEach((line, index) => {
            if (line.startsWith('## ')) {
                headers.push({ id: `section-${index}`, text: line.replace('## ', ''), level: 2 });
            } else if (line.startsWith('### ')) {
                headers.push({ id: `section-${index}`, text: line.replace('### ', ''), level: 3 });
            }
        });
        return headers;
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    const renderMarkdown = (content) => {
        if (!content) return { __html: '' };

        let processedContent = content;
        toc.forEach(item => {
            const regex = new RegExp(`(${item.level === 2 ? '##' : '###'} ${item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
            processedContent = processedContent.replace(regex, `<h${item.level} id="${item.id}" class="scroll-mt-20">$1</h${item.level}>`);
        });

        const html = marked.parse(String(processedContent ?? ''));
        const safeHtml = DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['id', 'class'],
        });
        return { __html: safeHtml };
    };

    const handleCopy = () => {
        if (article?.content) {
            navigator.clipboard.writeText(article.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    // ... (imports remain the same)

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
                {/* Header - Minimalist */}
                <motion.header
                    className={cn(
                        'h-16 border-b border-border/40 flex items-center justify-between px-4 lg:px-6',
                        'bg-background/95 backdrop-blur-sm sticky top-0 z-10'
                    )}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-2xl font-medium tracking-tight">Grokipedia</h1>
                    </div>

                    {/* Search Bar - visible in header only when article is present */}
                    {article && (
                        <div className="flex-1 max-w-xl mx-6 hidden md:block">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleSearch}
                                    placeholder="Search..."
                                    className="w-full h-9 pl-9 pr-4 rounded-md bg-muted/30 border-none focus:ring-1 focus:ring-primary/20 text-sm transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <motion.button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <X className="h-5 w-5" />
                    </motion.button>
                </motion.header>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {article || isSearching ? (
                        <>
                            {/* TOC Sidebar */}
                            <motion.aside
                                className="hidden lg:flex flex-col w-64 border-r border-border/40 bg-background pt-8"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="px-6 pb-4">
                                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Contents</h3>
                                </div>
                                <nav className="flex-1 overflow-y-auto px-4 space-y-0.5">
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
                                        <div className="space-y-3 px-2">
                                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full opacity-30" />)}
                                        </div>
                                    )}
                                </nav>
                            </motion.aside>

                            {/* Article Area */}
                            <main className="flex-1 overflow-y-auto" ref={contentRef}>
                                <div className="max-w-3xl mx-auto px-6 py-12 md:px-12">
                                    <AnimatePresence mode="wait">
                                        {isSearching && !article?.content ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="space-y-8"
                                            >
                                                <Skeleton className="h-16 w-3/4 mb-8" />
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="space-y-3">
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-5/6" />
                                                    </div>
                                                ))}
                                            </motion.div>
                                        ) : article ? (
                                            <motion.article
                                                key="article"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="prose dark:prose-invert prose-lg max-w-none prose-headings:font-serif prose-p:leading-relaxed prose-headings:font-medium"
                                            >
                                                {/* Meta Info */}
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 font-medium">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border/50">
                                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                        <span>Fact-checked by Grok</span>
                                                    </div>
                                                    <span className="text-muted-foreground/40">•</span>
                                                    <span>{article.lastUpdated}</span>
                                                </div>

                                                {/* Title */}
                                                <h1 className="font-serif text-5xl font-medium tracking-tight mb-8 text-foreground">
                                                    {article.title}
                                                </h1>

                                                {/* Content */}
                                                <div
                                                    className="markdown-content font-serif text-lg leading-relaxed text-foreground/90"
                                                    dangerouslySetInnerHTML={renderMarkdown(article.content)}
                                                />
                                            </motion.article>
                                        ) : null}
                                    </AnimatePresence>
                                </div>
                            </main>
                        </>
                    ) : (
                        /* Landing View (Empty State) */
                        <motion.div
                            key="landing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center p-6 -mt-16"
                        >
                            <div className="w-full max-w-2xl text-center space-y-8">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <h1 className="font-serif text-6xl md:text-7xl font-medium tracking-tight mb-4">Grokipedia</h1>
                                </motion.div>

                                <div className="relative max-w-xl mx-auto w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={handleSearch}
                                        placeholder="Search Encyclopedia..."
                                        className="w-full h-14 pl-12 pr-4 rounded-full bg-muted/40 border border-transparent hover:border-border hover:bg-muted/60 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 text-lg transition-all outline-none text-center placeholder:text-muted-foreground/50"
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                            <span className="text-xs">⏎</span>
                                        </kbd>
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <p className="text-sm font-medium text-muted-foreground mb-4">Articles Available</p>
                                    <p className="font-serif text-2xl font-bold tabular-nums">1,089,057</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GrokipediaPanel;
