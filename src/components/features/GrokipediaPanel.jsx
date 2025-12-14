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
                <motion.header
                    className={cn(
                        'h-16 border-b border-border flex items-center justify-between px-4 lg:px-6',
                        'bg-background/95 backdrop-blur-xl sticky top-0 z-10'
                    )}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center',
                            'bg-gradient-to-br from-primary/20 to-primary/5',
                            'border border-primary/20'
                        )}>
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">Grokipedia</h1>
                            <p className="text-xs text-muted-foreground">AI-Powered Encyclopedia</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-xl mx-6">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleSearch}
                                placeholder="Search any topic..."
                                className={cn(
                                    'w-full h-11 pl-11 pr-20 rounded-xl',
                                    'bg-muted/50 border border-transparent',
                                    'hover:bg-muted focus:bg-background',
                                    'focus:border-border focus:ring-2 focus:ring-primary/20',
                                    'text-sm transition-all outline-none'
                                )}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {isSearching ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </motion.div>
                                ) : (
                                    <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                                        <span>⌘</span>K
                                    </kbd>
                                )}
                            </div>
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

                {/* Main Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar (TOC) */}
                    <motion.aside
                        className="hidden lg:flex flex-col w-72 border-r border-border bg-background/50"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="p-4 border-b border-border/50">
                            <h3 className="font-semibold text-sm text-muted-foreground">Table of Contents</h3>
                        </div>
                        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                                <div className="space-y-2 p-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            )}
                        </nav>
                    </motion.aside>

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto" ref={contentRef}>
                        <div className="max-w-3xl mx-auto px-6 py-10 md:px-10">
                            <AnimatePresence mode="wait">
                                {isSearching && !article?.content ? (
                                    <motion.div
                                        key="loading"
                                        variants={contentVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="hidden"
                                        className="space-y-8"
                                    >
                                        <Skeleton className="h-12 w-3/4" />
                                        <div className="space-y-4">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-5/6" />
                                        </div>
                                        <div className="space-y-4">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-4/5" />
                                        </div>
                                    </motion.div>
                                ) : article ? (
                                    <motion.article
                                        key="article"
                                        variants={contentVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="prose dark:prose-invert prose-lg max-w-none"
                                    >
                                        {/* Article Header */}
                                        <div className="mb-8 pb-8 border-b border-border">
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-primary" />
                                                    <span>Generated by Grok</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{article.lastUpdated}</span>
                                                </div>
                                            </div>
                                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                                {article.title}
                                            </h1>
                                            {/* Action Bar */}
                                            <div className="flex items-center gap-2 mt-6">
                                                <motion.button
                                                    onClick={handleCopy}
                                                    className={cn(
                                                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                                                        'bg-muted hover:bg-muted/80 transition-colors'
                                                    )}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                                                </motion.button>
                                                <motion.button
                                                    className={cn(
                                                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                                                        'bg-muted hover:bg-muted/80 transition-colors'
                                                    )}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                    <span>Share</span>
                                                </motion.button>
                                            </div>
                                        </div>

                                        {/* Article Body */}
                                        <div
                                            className="markdown-content leading-relaxed"
                                            dangerouslySetInnerHTML={renderMarkdown(article.content)}
                                        />
                                    </motion.article>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        variants={contentVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="flex flex-col items-center justify-center h-[60vh] text-center"
                                    >
                                        <motion.div
                                            className={cn(
                                                'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
                                                'bg-gradient-to-br from-primary/20 to-primary/5',
                                                'border border-primary/20'
                                            )}
                                            animate={{
                                                scale: [1, 1.05, 1],
                                                rotate: [0, 5, -5, 0]
                                            }}
                                            transition={{ duration: 4, repeat: Infinity }}
                                        >
                                            <BookOpen className="h-10 w-10 text-primary" />
                                        </motion.div>
                                        <h2 className="text-3xl font-bold mb-3">Explore Grokipedia</h2>
                                        <p className="text-muted-foreground max-w-md mb-8">
                                            Search any topic to get a comprehensive, AI-generated article powered by Grok.
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {['Quantum Computing', 'Black Holes', 'Neural Networks', 'Climate Change'].map((topic) => (
                                                <motion.button
                                                    key={topic}
                                                    onClick={() => {
                                                        setQuery(topic);
                                                        setTimeout(() => handleSearch({ key: 'Enter' }), 100);
                                                    }}
                                                    className={cn(
                                                        'px-4 py-2 rounded-full text-sm font-medium',
                                                        'bg-muted hover:bg-primary/10 hover:text-primary',
                                                        'transition-all'
                                                    )}
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    {topic}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </main>

                    {/* Right Sidebar - Article Info */}
                    <motion.aside
                        className="hidden xl:flex flex-col w-72 border-l border-border bg-muted/20 p-6"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {article && (
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl border border-border bg-card">
                                    <h4 className="font-semibold mb-3 text-sm">About this article</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Source</span>
                                            <span className="font-medium flex items-center gap-1">
                                                <Sparkles className="h-3 w-3 text-primary" />
                                                Grok AI
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sections</span>
                                            <span className="font-medium">{toc.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Words</span>
                                            <span className="font-medium">
                                                ~{article.content ? article.content.split(/\s+/).length : 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Related Topics */}
                                <div className="p-4 rounded-xl border border-border bg-card">
                                    <h4 className="font-semibold mb-3 text-sm">Related Topics</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['AI', 'Technology', 'Science', 'Research'].map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 rounded-md bg-muted text-xs font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.aside>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GrokipediaPanel;
