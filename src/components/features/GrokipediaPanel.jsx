/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KNOWLEDGE - AI-Powered Deep Research Encyclopedia
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Real-time streaming with web search integration (RAG)
 * - Powered by Google Gemini AI via OpenRouter
 * - Deep Research Mode with advanced web search
 * - Wikipedia-style interactive articles
 * - Source attribution and citation tracking
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, BookOpen, Clock, ChevronUp, ChevronDown, ChevronRight,
    ListOrdered, Tags, Zap, Copy, Check, Share2,
    Sparkles, TrendingUp, History, Crown, Brain, Globe, ExternalLink,
    Filter, Info, Layout, ArrowUp
} from 'lucide-react';
import { createApiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/hooks';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & MODELS
// ═══════════════════════════════════════════════════════════════════════════════

// Best free Gemini models for Wikipedia-style encyclopedic content
const GROKIPEDIA_MODEL = {
    id: 'google/gemini-2.5-flash-preview-05-20',
    name: 'Gemini Flash',
    fallback: 'google/gemini-2.0-flash-exp:free',
    fallback2: 'google/gemini-2.5-pro-exp-03-25:free'
};

const TRENDING_TOPICS = [
    "Salman Khan",
    "Elon Musk",
    "Artificial Intelligence",
    "Bitcoin",
    "Taylor Swift",
    "Climate Change",
    "SpaceX Starship",
    "ChatGPT"
];


// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const panelVariants = {
    hidden: { opacity: 0, scale: 1.02 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 1.02, transition: { duration: 0.2 } }
};

const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const tocItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i) => ({
        opacity: 1, x: 0, transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }
    })
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Skeleton = ({ className }) => (
    <div className={cn('animate-pulse bg-muted/50 rounded-lg', className)} />
);

const TocItem = ({ item, index, isActive, isParentActive, onClick, activeSection, expandedSections, toggleSection }) => {
    const isMain = item.level === 2;
    const hasSubItems = isMain && item.subItems && item.subItems.length > 0;
    const isExpanded = expandedSections?.includes(item.id) || isParentActive;
    const hasActiveChild = hasSubItems && item.subItems.some(sub => sub.id === activeSection);

    return (
        <div className="flex flex-col">
            <motion.button
                custom={index}
                variants={tocItemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => {
                    onClick(item.id);
                    if (hasSubItems && toggleSection) {
                        toggleSection(item.id);
                    }
                }}
                className={cn(
                    'w-full text-left py-1.5 transition-all flex items-center relative group',
                    isMain ? 'text-[13px] pr-2' : 'text-[12px] pl-4',
                    isActive
                        ? 'text-foreground font-semibold'
                        : hasActiveChild
                            ? 'text-foreground/80'
                            : isParentActive || !isMain
                                ? 'text-muted-foreground hover:text-foreground'
                                : 'text-muted-foreground/70 hover:text-foreground'
                )}
            >
                {/* Active indicator dot */}
                <span className={cn(
                    'w-1.5 h-1.5 rounded-full mr-2.5 flex-shrink-0 transition-all',
                    isActive ? 'bg-blue-500' : hasActiveChild ? 'bg-blue-500/30' : 'bg-muted-foreground/20'
                )} />

                <span className="truncate flex-1">{item.title}</span>

                {/* Expand icon for sections with subsections */}
                {hasSubItems && (
                    <ChevronRight className={cn(
                        'h-3 w-3 text-muted-foreground/40 transition-transform flex-shrink-0',
                        isExpanded && 'rotate-90'
                    )} />
                )}
            </motion.button>

            {/* Subsections */}
            {hasSubItems && (
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-l border-border/40 ml-[5px]"
                        >
                            {item.subItems.map((sub, i) => (
                                <motion.button
                                    key={sub.id}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => onClick(sub.id)}
                                    className={cn(
                                        'w-full text-left py-1 pl-4 pr-2 text-[11px] transition-all flex items-center',
                                        activeSection === sub.id
                                            ? 'text-foreground font-medium'
                                            : 'text-muted-foreground/60 hover:text-foreground'
                                    )}
                                >
                                    <span className={cn(
                                        'w-1 h-1 rounded-full mr-2 flex-shrink-0',
                                        activeSection === sub.id ? 'bg-blue-500' : 'bg-muted-foreground/30'
                                    )} />
                                    <span className="truncate">{sub.title}</span>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

const SourceCard = ({ source, index }) => {
    let hostname = 'source';
    try {
        hostname = new URL(source.url || 'https://google.com').hostname.replace('www.', '');
    } catch (e) { }

    return (
        <motion.a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2 py-2 px-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
            <span className="font-mono text-[10px] text-muted-foreground/50 w-4">{index + 1}.</span>
            <span className="truncate flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">{hostname}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.a>
    );
};



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
    const [activeParent, setActiveParent] = useState(null);
    const [isTocExpanded, setIsTocExpanded] = useState(true);
    const [relatedTopics, setRelatedTopics] = useState([]);
    const [quickFacts, setQuickFacts] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isDeepSearch, setIsDeepSearch] = useLocalStorage('grokipedia_deep_search', true);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const [expandedSections, setExpandedSections] = useState([]);

    const contentRef = useRef(null);
    const searchInputRef = useRef(null);

    // Load search history
    useEffect(() => {
        const saved = localStorage.getItem('grokipedia-history-v3');
        if (saved) setSearchHistory(JSON.parse(saved));
    }, []);

    // Save search to history
    const saveToHistory = useCallback((term) => {
        const updated = [term, ...searchHistory.filter(t => t !== term)].slice(0, 8);
        setSearchHistory(updated);
        localStorage.setItem('grokipedia-history-v3', JSON.stringify(updated));
    }, [searchHistory]);

    // Intersection Observer for scroll tracking
    useEffect(() => {
        if (!article || !toc.length) return;

        const observerOptions = {
            root: contentRef.current,
            rootMargin: '-10% 0px -80% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    setActiveSection(id);

                    // Find if this is an H2 or H3 and set parent accordingly
                    const h2 = toc.find(item => item.id === id || item.subItems?.some(sub => sub.id === id));
                    if (h2) setActiveParent(h2.id);
                }
            });
        }, observerOptions);

        const headings = document.querySelectorAll('.grokipedia-article h2, .grokipedia-article h3');
        headings.forEach(h => observer.observe(h));

        return () => observer.disconnect();
    }, [article, toc]);

    // Scroll handler for scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            if (contentRef.current) {
                setShowScrollTop(contentRef.current.scrollTop > 400);
            }
        };
        const ref = contentRef.current;
        ref?.addEventListener('scroll', handleScroll);
        return () => ref?.removeEventListener('scroll', handleScroll);
    }, []);

    // Cmd+K keyboard shortcut to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const parseToc = (markdown) => {
        const lines = markdown.split('\n');
        const tocItems = [];
        let currentH2 = null;

        // Sections to exclude from ToC (we render our own)
        const excludedSections = ['see also', 'references', 'sources', 'citations', 'related topics', 'further reading'];

        lines.forEach((line) => {
            const h2Match = line.match(/^##\s+(.+)$/);
            const h3Match = line.match(/^###\s+(.+)$/);

            if (h2Match) {
                const title = h2Match[1].replace(/\*\*/g, '').trim();
                const titleLower = title.toLowerCase();

                // Skip excluded sections
                if (excludedSections.some(ex => titleLower.includes(ex))) {
                    currentH2 = null; // Don't add subsections to excluded sections
                    return;
                }

                const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                currentH2 = { id, title, level: 2, subItems: [] };
                tocItems.push(currentH2);
            } else if (h3Match && currentH2) {
                const title = h3Match[1].replace(/\*\*/g, '').trim();
                const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                currentH2.subItems.push({ id, title, level: 3 });
            }
        });
        return tocItems;
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const parseRelatedTopics = (markdown) => {
        // Try multiple section names that the AI might use
        const patterns = [
            /##\s*Related Topics[\s\S]*?(?=##|$)/i,
            /##\s*See Also[\s\S]*?(?=##|$)/i,
            /##\s*Further Reading[\s\S]*?(?=##|$)/i,
            /##\s*Related[\s\S]*?(?=##|$)/i
        ];

        let match = null;
        for (const pattern of patterns) {
            match = markdown.match(pattern);
            if (match) break;
        }

        if (!match) {
            // Fallback: extract related topics from italicized text at the end
            const italicMatch = markdown.match(/\*([^*]+)\*(?:\s+\*([^*]+)\*)+/g);
            if (italicMatch) {
                const topics = italicMatch.join(' ').match(/\*([^*]+)\*/g) || [];
                return topics.slice(0, 8).map(t => t.replace(/\*/g, '').trim()).filter(t => t.length > 2);
            }
            return [];
        }

        const items = match[0].match(/[-•*]\s*(.+)/g) || [];
        return items.slice(0, 8).map(item =>
            item.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim()
        ).filter(t => t.length > 2);
    };

    // Parse References section from the AI-generated article
    const parseReferences = (markdown, sources = []) => {
        // Try to find the References section in the article
        const refsMatch = markdown.match(/##\s*References[\s\S]*$/i);

        if (refsMatch) {
            // Extract numbered references like "1. https://..." or "[1] https://..."
            const urlPattern = /(?:\d+\.\s*|\[\d+\]\s*)(https?:\/\/[^\s\n]+)/gi;
            const urls = [];
            let match;

            while ((match = urlPattern.exec(refsMatch[0])) !== null) {
                urls.push({
                    url: match[1].replace(/[.,;:'")\]]*$/, ''), // Clean trailing punctuation
                    title: null
                });
            }

            if (urls.length > 0) {
                // Try to get titles from the sources array
                return urls.map((ref, i) => {
                    const matchingSource = sources.find(s => s.url && ref.url.includes(new URL(s.url).hostname));
                    return {
                        ...ref,
                        title: matchingSource?.title || null
                    };
                });
            }
        }

        // Fallback: return sources that have valid URLs
        return sources
            .filter(s => s.url && !s.url.includes('google.com') && !s.title?.toLowerCase().includes('ai knowledge'))
            .map(s => ({ url: s.url, title: s.title }));
    };

    const extractQuickFacts = (topic, content) => {
        const words = content.split(/\s+/).length;
        const readTime = Math.ceil(words / 200);
        const sectionCount = (content.match(/^##\s+/gm) || []).length;
        setQuickFacts({
            readTime: `${readTime} min read`,
            sections: sectionCount,
            topic: topic,
            wordCount: words
        });
    };

    const handleSearch = async (searchQuery = searchTerm) => {
        const term = searchQuery.trim();
        if (!term) return;

        setIsSearching(true);
        setArticle(null);
        setToc([]);
        setRelatedTopics([]);
        setQuickFacts(null);
        saveToHistory(term);
        setShowHistory(false);

        try {
            setArticle({
                title: term,
                content: '',
                lastUpdated: new Date().toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }),
                sources: [],
                model: GROKIPEDIA_MODEL.name
            });

            if (isDeepSearch) {
                const response = await fetch(`${backendUrl}/api/knowledge/grokipedia/stream`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: term,
                        max_results: 8,
                        search_depth: 'advanced'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                if (!response.body) throw new Error("Connection failed");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulated = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === '[DONE]') break;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'metadata') {
                                    setArticle(prev => ({ ...prev, sources: data.sources }));
                                } else if (data.type === 'content') {
                                    accumulated += data.delta;
                                    setArticle(prev => ({ ...prev, content: accumulated }));
                                } else if (data.type === 'error') {
                                    throw new Error(data.message || 'Article generation failed');
                                }
                            } catch (e) {
                                if (e.message && !e.message.includes('JSON')) {
                                    throw e;
                                }
                            }
                        }
                    }
                }

            } else {
                // Non-deep search: Direct LLM generation without web search
                const api = createApiClient({ baseUrl: backendUrl });
                let accumulatedContent = '';
                await api.streamChat({
                    model: GROKIPEDIA_MODEL.id,
                    messages: [
                        { role: 'system', content: 'You are Grokipedia. Write a high-quality, Wikipedia-style encyclopedia article.' },
                        { role: 'user', content: `Write a detailed article about: ${term}` }
                    ],
                    onDelta: (delta) => {
                        accumulatedContent += delta;
                        setArticle(prev => ({ ...prev, content: accumulatedContent }));
                    }
                });
            }


            // Sync metrics after streaming completes
            setArticle(prev => {
                const content = prev?.content || "";
                setToc(parseToc(content));
                setRelatedTopics(parseRelatedTopics(content));
                extractQuickFacts(term, content);
                return prev;
            });

        } catch (error) {
            console.error('Search failed:', error);
            setArticle(prev => ({
                ...prev,
                content: (prev?.content || "") + '\n\n> ⚠️ **DeepSearch Offline:** Unable to reach research servers. Please try again later.'
            }));
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeySearch = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

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


    const renderMarkdown = (content) => {
        if (!content) return '';

        let html = content;

        // Remove AI-generated References/See Also sections (we render our own)
        // This prevents duplicate sections
        html = html.replace(/## References[\s\S]*?(?=## |$)/gi, '');
        html = html.replace(/## See Also[\s\S]*?(?=## |$)/gi, '');
        html = html.replace(/## Sources[\s\S]*?(?=## |$)/gi, '');
        html = html.replace(/## Citations[\s\S]*?(?=## |$)/gi, '');

        // H2 headings with IDs
        html = html.replace(/^## (.+)$/gm, (match, p1) => {
            const id = p1.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return `<h2 id="${id}" class="grok-h2">${p1}</h2>`;
        });

        // H3 headings with IDs
        html = html.replace(/^### (.+)$/gm, (match, p1) => {
            const id = p1.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return `<h3 id="${id}" class="grok-h3">${p1}</h3>`;
        });

        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="grok-bold">$1</strong>');

        // Italic
        html = html.replace(/\*([^\*]+?)\*/g, '<em class="grok-italic">$1</em>');

        // Citations
        html = html.replace(/\[(\d+)\]/g, '<sup class="grok-citation" title="Source $1">[$1]</sup>');

        // Lists
        html = html.replace(/^[•\-\*]\s+(.+)$/gm, '<li class="grok-li">$1</li>');
        html = html.replace(/((?:<li class="grok-li">.*?<\/li>\s*)+)/g, '<ul class="grok-ul">$1</ul>');

        // Blockquotes  
        html = html.replace(/^> (.+)$/gm, '<blockquote class="grok-quote">$1</blockquote>');

        // Paragraphs
        html = html.split('\n\n').map(para => {
            para = para.trim();
            if (!para) return '';
            if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<blockquote')) {
                return para;
            }
            return `<p class="grok-p">${para}</p>`;
        }).join('\n');

        return html;
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
                {/* Global Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-px bg-foreground/5 pointer-events-none" />

                {/* Navbar */}
                <header className="h-14 flex items-center justify-between px-4 md:px-8 bg-background border-b border-border/80 sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-1.5 rounded bg-foreground text-background"
                            whileHover={{ scale: 1.05 }}
                        >
                            <BookOpen className="h-4 w-4" />
                        </motion.div>
                        <h1 className="font-bold text-base tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Knowledge</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span className="h-1 w-1 rounded-full bg-green-500" />
                            {GROKIPEDIA_MODEL.name}
                        </div>

                        <motion.button
                            onClick={onClose}
                            className="p-2.5 hover:bg-muted rounded-2xl transition-all border border-transparent hover:border-border"
                            whileHover={{ scale: 1.05 }}
                        >
                            <X className="h-5 w-5" />
                        </motion.button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar: Clean grokipedia.com style */}
                    <AnimatePresence>
                        {article && (
                            <motion.aside
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="hidden lg:flex w-64 border-r border-border/40 flex-col bg-background"
                            >
                                <div className="flex-1 overflow-y-auto py-8 px-5 custom-scrollbar-mini">
                                    {/* Table of Contents */}
                                    <div className="mb-8">
                                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                            In this article
                                        </h3>
                                        <nav className="space-y-0.5">
                                            {toc.map((item, index) => (
                                                <TocItem
                                                    key={item.id}
                                                    item={item}
                                                    index={index}
                                                    isActive={activeSection === item.id}
                                                    isParentActive={activeParent === item.id}
                                                    activeSection={activeSection}
                                                    expandedSections={expandedSections}
                                                    toggleSection={toggleSection}
                                                    onClick={(id) => scrollToSection(id || item.id)}
                                                />
                                            ))}
                                        </nav>
                                    </div>

                                    {/* Sources - show web sources or AI indicator */}
                                    {(() => {
                                        // Filter to only real web sources (not generic placeholders)
                                        const realSources = (article.sources || []).filter(source => {
                                            if (!source.url) return false;
                                            const url = source.url.toLowerCase();
                                            // Exclude generic/placeholder sources
                                            if (url === 'https://google.com' || url === 'http://google.com') return false;
                                            if (url.includes('example.com')) return false;
                                            if (source.title?.toLowerCase().includes('ai knowledge base')) return false;
                                            if (source.title?.toLowerCase().includes('ai summary')) return false;
                                            return true;
                                        });

                                        if (realSources.length > 0) {
                                            return (
                                                <div className="mb-8 pt-6 border-t border-border/40">
                                                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                                                        <span>Web Sources</span>
                                                        <span className="text-[10px] font-normal text-muted-foreground/60">{realSources.length}</span>
                                                    </h3>
                                                    <div className="space-y-0">
                                                        {realSources.slice(0, 6).map((source, i) => (
                                                            <SourceCard key={i} source={source} index={i} />
                                                        ))}
                                                        {realSources.length > 6 && (
                                                            <p className="text-[10px] text-muted-foreground/50 pt-2 pl-5">
                                                                +{realSources.length - 6} more
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // Show AI Generated indicator
                                            return (
                                                <div className="mb-8 pt-6 border-t border-border/40">
                                                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                                        Data Source
                                                    </h3>
                                                    <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <Sparkles className="h-4 w-4 text-blue-500" />
                                                        <div className="text-xs">
                                                            <span className="font-medium text-blue-700 dark:text-blue-300">AI Knowledge</span>
                                                            <span className="text-blue-600/60 dark:text-blue-400/60 block text-[10px]">Generated from Gemini's training data</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })()}

                                    {/* Article Stats */}
                                    {quickFacts && (
                                        <div className="pt-6 border-t border-border/40">
                                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                                Article Info
                                            </h3>
                                            <div className="space-y-2.5 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Words</span>
                                                    <span className="font-medium">{quickFacts.wordCount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Read time</span>
                                                    <span className="font-medium">{quickFacts.readTime}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Sections</span>
                                                    <span className="font-medium">{toc.length}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Research</span>
                                                    <span className="font-medium text-green-600 dark:text-green-400">
                                                        {isDeepSearch ? 'Deep Search' : 'Standard'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between pt-1 border-t border-border/30 mt-1">
                                                    <span className="text-muted-foreground">Model</span>
                                                    <span className="font-medium text-blue-600 dark:text-blue-400">{GROKIPEDIA_MODEL.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>

                    {/* Main Stage */}
                    <main ref={contentRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar bg-background">
                        <div className="max-w-4xl mx-auto px-6 py-12">

                            {/* Unified Search Deck */}
                            <motion.div
                                className="mb-12"
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                            >
                                <div className="relative group max-w-2xl mx-auto">
                                    <div className="relative flex flex-col gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-foreground" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onKeyDown={handleKeySearch}
                                                onFocus={() => setShowHistory(true)}
                                                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                                                placeholder="Search anything..."
                                                className="w-full h-12 pl-12 pr-24 bg-background border border-border rounded-full text-base font-normal placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/10 focus:border-foreground/20 transition-all"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                {/* Cmd+K shortcut hint - matching grokipedia.com */}
                                                {!searchTerm && !isSearching && (
                                                    <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/50 bg-muted/50 rounded border border-border/50">
                                                        <span className="text-[11px]">⌘</span>K
                                                    </kbd>
                                                )}
                                                {isSearching && (
                                                    <div className="h-4 w-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                                                )}
                                                <button
                                                    onClick={() => handleSearch()}
                                                    disabled={isSearching || !searchTerm.trim()}
                                                    className="p-1.5 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-all disabled:opacity-50"
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Engine Toggle */}
                                        <div className="flex items-center justify-center gap-6 px-2">
                                            <button
                                                onClick={() => setIsDeepSearch(!isDeepSearch)}
                                                className={cn(
                                                    "flex items-center gap-2 text-[10px] font-bold tracking-widest transition-all uppercase",
                                                    isDeepSearch
                                                        ? "text-foreground"
                                                        : "text-muted-foreground/50"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", isDeepSearch ? "bg-green-500" : "bg-muted-foreground/20")} />
                                                Deep Research {isDeepSearch ? "ON" : "OFF"}
                                            </button>
                                            <div className="text-[10px] text-muted-foreground/40 font-medium italic">
                                                Web Search Enabled
                                            </div>
                                        </div>
                                    </div>

                                    {/* History Overlay */}
                                    <AnimatePresence>
                                        {showHistory && searchHistory.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute z-[100] top-full mt-4 w-full bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden p-2"
                                            >
                                                <div className="px-4 py-2 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recent Searches</span>
                                                    <History className="h-3.5 w-3.5 text-muted-foreground opacity-30" />
                                                </div>
                                                {searchHistory.map((term, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setSearchTerm(term); handleSearch(term); }}
                                                        className="w-full px-4 py-3 text-left hover:bg-muted rounded-xl transition-all flex items-center gap-3 group"
                                                    >
                                                        <Search className="h-4 w-4 text-muted-foreground/40 group-hover:text-blue-500" />
                                                        <span className="text-sm font-medium">{term}</span>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>

                            {/* Home Screen: Trending & Discovery */}
                            {!article && !isSearching && (
                                <motion.div variants={contentVariants} initial="hidden" animate="visible" className="space-y-12">
                                    <div className="text-center space-y-4">
                                        <div className="flex justify-center mb-6">
                                            <div className="w-12 h-12 rounded bg-foreground flex items-center justify-center text-background">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Deep Research</h2>
                                        <p className="text-base text-muted-foreground max-w-xl mx-auto font-normal leading-relaxed">
                                            AI-powered encyclopedia articles generated by Gemini with real-time web research.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-8 border-t border-border/40">
                                        <div className="col-span-full mb-2 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-blue-500" />
                                            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Explore Topics</span>
                                        </div>
                                        {TRENDING_TOPICS.map((topic, i) => (
                                            <motion.button
                                                key={topic}
                                                whileHover={{ y: -4, scale: 1.02 }}
                                                onClick={() => { setSearchTerm(topic); handleSearch(topic); }}
                                                className="p-4 bg-muted/30 border border-border/40 rounded-2xl text-left hover:bg-background hover:border-blue-500/30 transition-all group"
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center mb-3 border border-border group-hover:bg-blue-500/10 transition-colors">
                                                    <Zap className="h-4 w-4 text-muted-foreground group-hover:text-blue-500" />
                                                </div>
                                                <span className="text-sm font-bold block">{topic}</span>
                                                <span className="text-[10px] text-muted-foreground mt-1 block opacity-60">Generate Article &rarr;</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Research Loading Pipeline */}
                            {isSearching && !article?.content && (
                                <div className="space-y-12 py-12">
                                    <div className="space-y-6">
                                        <Skeleton className="h-14 w-2/3" />
                                        <div className="flex gap-4">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm font-black uppercase text-muted-foreground animate-pulse">Researching with Gemini...</span>
                                        </div>
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <Skeleton className="h-4 w-4/6" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Skeleton className="h-32 rounded-2xl" />
                                        <Skeleton className="h-32 rounded-2xl" />
                                    </div>
                                </div>
                            )}

                            {/* Final Article Production */}
                            {article && (
                                <motion.article variants={contentVariants} initial="hidden" animate="visible">
                                    <header className="mb-10">
                                        {/* AI-Verified badge */}
                                        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                            <span>AI-Verified • {GROKIPEDIA_MODEL.name} • {article.lastUpdated}</span>
                                        </div>

                                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6" style={{ fontFamily: "'Source Serif 4', serif" }}>
                                            {article.title}
                                        </h1>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border/60">
                                            <span>{quickFacts?.wordCount?.toLocaleString() || '—'} words</span>
                                            <span className="text-muted-foreground/30">•</span>
                                            <span>{quickFacts?.readTime || '—'}</span>
                                            <span className="text-muted-foreground/30">•</span>
                                            <span>{article.sources?.length || '0'} sources</span>
                                        </div>

                                        <div className="flex gap-2 pt-4">
                                            <button onClick={async () => { await navigator.clipboard.writeText(article.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg transition-all text-xs font-medium flex items-center gap-2">
                                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copied ? 'Copied!' : 'Copy'}
                                            </button>
                                            <button className="px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg transition-all text-xs font-medium flex items-center gap-2">
                                                <Share2 className="h-3.5 w-3.5" />
                                                Share
                                            </button>
                                        </div>
                                    </header>

                                    <div
                                        className="grokipedia-article"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
                                    />

                                    {/* References Section - grokipedia style */}
                                    {!isSearching && (() => {
                                        // Parse references from the article content
                                        const refs = parseReferences(article.content, article.sources || []);

                                        // Also extract any URLs directly mentioned in the References section of the content
                                        const refsSection = article.content.match(/##\s*References[\s\S]*$/i);
                                        const inlineRefs = [];
                                        if (refsSection) {
                                            // Match patterns like "1. URL" or "[1] URL" or just bare URLs
                                            const urlMatches = refsSection[0].matchAll(/(?:(\d+)\.\s*|\[(\d+)\]\s*)?(https?:\/\/[^\s\n<>)"']+)/gi);
                                            for (const m of urlMatches) {
                                                const url = m[3].replace(/[.,;:'")\]]*$/, '');
                                                if (!inlineRefs.find(r => r.url === url)) {
                                                    inlineRefs.push({ url, num: m[1] || m[2] || null });
                                                }
                                            }
                                        }

                                        // Combine and deduplicate
                                        const allRefs = inlineRefs.length > 0 ? inlineRefs : refs;
                                        const uniqueRefs = allRefs.reduce((acc, ref) => {
                                            if (!acc.find(r => r.url === ref.url)) {
                                                acc.push(ref);
                                            }
                                            return acc;
                                        }, []);

                                        return uniqueRefs.length > 0 ? (
                                            <section className="mt-16 pt-8 border-t border-border/50">
                                                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Source Serif 4', serif" }}>References</h2>
                                                <div className="space-y-2">
                                                    {uniqueRefs.map((ref, i) => {
                                                        let hostname = 'source';
                                                        let displayUrl = ref.url;
                                                        try {
                                                            const urlObj = new URL(ref.url);
                                                            hostname = urlObj.hostname.replace('www.', '');
                                                            displayUrl = urlObj.pathname.length > 1
                                                                ? `${hostname}${urlObj.pathname.slice(0, 40)}${urlObj.pathname.length > 40 ? '...' : ''}`
                                                                : hostname;
                                                        } catch (e) { }

                                                        return (
                                                            <div key={i} className="flex items-start gap-3 py-1.5 group">
                                                                <span className="font-mono text-xs text-muted-foreground/60 w-6 flex-shrink-0 pt-0.5 text-right">{i + 1}.</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <a
                                                                        href={ref.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                                                    >
                                                                        <span className="truncate">{displayUrl}</span>
                                                                        <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        ) : (
                                            // Show AI Knowledge notice when no references found
                                            <section className="mt-16 pt-8 border-t border-border/50">
                                                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Source Serif 4', serif" }}>References</h2>
                                                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                                    <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                                    <div className="text-sm">
                                                        <span className="font-semibold text-blue-700 dark:text-blue-300 block">AI-Generated Content</span>
                                                        <span className="text-muted-foreground text-xs">
                                                            This article was generated using {GROKIPEDIA_MODEL.name}'s extensive training knowledge.
                                                            Web search was attempted but did not return usable sources for this topic.
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>
                                        );
                                    })()}

                                    {/* See Also Section */}
                                    {!isSearching && (
                                        <section className="mt-12 pt-8 border-t border-border/50">
                                            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Source Serif 4', serif" }}>See Also</h2>
                                            <div className="flex flex-wrap gap-2">
                                                {(relatedTopics.length > 0 ? relatedTopics : [
                                                    // Fallback topics based on the current article title
                                                    `History of ${article.title}`,
                                                    `${article.title} impact`,
                                                    `${article.title} overview`
                                                ].filter(t => t && !t.includes('undefined'))).map((topic, i) => (
                                                    <motion.button
                                                        key={topic}
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => { setSearchTerm(topic); handleSearch(topic); }}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-muted/20 border border-border/50 rounded-full text-sm font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 group"
                                                    >
                                                        <Search className="h-3 w-3 text-muted-foreground/50 group-hover:text-blue-500" />
                                                        {topic}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </motion.article>
                            )}
                        </div>
                    </main>
                </div>

                <AnimatePresence>
                    {showScrollTop && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="fixed bottom-8 right-8 p-3 bg-foreground text-background rounded-full shadow-xl hover:bg-foreground/90 transition-all z-[100]"
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
