/**
 * Enhanced Sidebar Component with Framer Motion
 * Apple & Japanese Design Aesthetics
 * 
 * Features:
 * - Smooth slide animations
 * - Staggered list animations
 * - Hover micro-interactions
 * - Glass morphism effects
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    BookOpen,
    MessageSquare,
    Mic,
    Image as ImageIcon,
    Settings,
    Gauge,
    Trash2,
    Edit2,
    Check,
    X,
    ChevronLeft,
    LayoutGrid,
    Plus,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Animation variants
const sidebarVariants = {
    hidden: { x: '-100%', opacity: 0.8 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        },
    },
    exit: {
        x: '-100%',
        opacity: 0.8,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 40,
        },
    },
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const staggerContainer = {
    visible: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

const staggerItem = {
    hidden: { opacity: 0, x: -10 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
};

// NavItem with motion
const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
    <motion.button
        onClick={onClick}
        className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
            active
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
        )}
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
    >
        <Icon className={cn(
            'h-[18px] w-[18px] transition-all',
            active && 'text-primary'
        )} />
        <span className="flex-1 text-left">{label}</span>
        {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                {badge}
            </span>
        )}
    </motion.button>
);

// Chat item with hover actions
const ChatItem = ({
    chat,
    isActive,
    isEditing,
    editTitle,
    onSelect,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    setEditTitle,
    index,
}) => {
    if (isEditing) {
        return (
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="px-3 py-2 flex items-center gap-2 bg-card rounded-xl border-2 border-primary/50 shadow-lg"
            >
                <input
                    id={`chat-rename-${chat.id}`}
                    name="chat-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                    autoFocus
                    autoComplete="off"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveEdit();
                        if (e.key === 'Escape') onCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <motion.button
                    onClick={onSaveEdit}
                    className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Check className="h-4 w-4" />
                </motion.button>
                <motion.button
                    onClick={onCancelEdit}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <X className="h-4 w-4" />
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={staggerItem}
            onClick={() => onSelect(chat.id)}
            className={cn(
                'group relative w-full text-left px-3 py-3 rounded-xl border transition-all cursor-pointer',
                isActive
                    ? 'border-primary/30 bg-primary/5 shadow-sm'
                    : 'border-transparent bg-card/50 hover:border-border hover:bg-foreground/5'
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            layout
        >
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                    isActive
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/50 bg-background/50'
                )}>
                    <MessageSquare className="h-4 w-4" />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {chat.title || 'Untitled Chat'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {chat.messageCount
                            ? `${chat.messageCount} messages`
                            : `Chat #${index + 1}`}
                    </p>
                </div>

                {/* Actions - visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit(chat);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(chat.id);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                </div>
            </div>

            {/* Active indicator */}
            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            )}
        </motion.div>
    );
};

const Sidebar = ({
    show,
    onClose,
    onNewChat,
    onNavigate,
    conversations = [],
    currentChatId,
    onSelectChat,
    onRenameChat,
    onDeleteChat,
    activePath
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingChatId, setEditingChatId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    const filteredConversations = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return conversations;
        return conversations.filter(chat =>
            (chat.title || '').toLowerCase().includes(term)
        );
    }, [searchTerm, conversations]);

    const startEditing = (chat) => {
        setEditingChatId(chat.id);
        setEditTitle(chat.title);
    };

    const saveEdit = () => {
        if (editingChatId && editTitle.trim()) {
            onRenameChat(editingChatId, editTitle.trim());
        }
        setEditingChatId(null);
    };

    const cancelEdit = () => {
        setEditingChatId(null);
    };

    const featureLinks = [
        { icon: ImageIcon, label: 'Imagine', path: '/imagine', badge: 'AI' },
        { icon: Mic, label: 'Voice Mode', path: '/voice' },
        { icon: BookOpen, label: 'Grokipedia', path: '/grokipedia' },
        { icon: LayoutGrid, label: 'AI Studio', path: '/ai-studio' },
        { icon: Gauge, label: 'Speedtest', path: '/speedtest' },
    ];

    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                        onClick={onClose}
                    />

                    {/* Sidebar */}
                    <motion.aside
                        variants={sidebarVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={cn(
                            'fixed inset-y-0 left-0 w-[85vw] max-w-[320px] md:w-80 lg:w-96',
                            'bg-background/95 backdrop-blur-xl border-r border-border/50',
                            'flex flex-col overflow-hidden z-50 shadow-2xl'
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-4 flex-none safe-area-top">
                            <motion.div
                                className="flex items-center gap-3"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="relative">
                                    <img
                                        src="/assets/logo.png"
                                        alt="AssistMe"
                                        className="h-10 w-10 rounded-xl shadow-lg object-cover ring-1 ring-black/5 dark:ring-white/10"
                                    />
                                    <motion.div
                                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </div>
                                <div>
                                    <p className="text-lg font-bold tracking-tight">AssistMe</p>
                                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        AI Assistant
                                    </p>
                                </div>
                            </motion.div>

                            <motion.button
                                onClick={onClose}
                                className="md:hidden p-2.5 rounded-xl bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <X className="h-5 w-5" />
                            </motion.button>
                        </div>

                        {/* New Chat & Search */}
                        <div className="px-4 pb-4 space-y-3 flex-none">
                            <motion.button
                                onClick={onNewChat}
                                className={cn(
                                    'w-full flex items-center justify-center gap-2.5',
                                    'bg-primary text-primary-foreground rounded-xl px-4 py-3',
                                    'font-semibold shadow-lg shadow-primary/25',
                                    'hover:shadow-xl hover:shadow-primary/30 transition-all'
                                )}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Plus className="h-5 w-5" />
                                <span>New Chat</span>
                            </motion.button>

                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <input
                                    id="chat-search"
                                    name="chat-search"
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search chats..."
                                    className={cn(
                                        'w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl',
                                        'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20',
                                        'placeholder:text-muted-foreground/70 transition-all'
                                    )}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* Features */}
                        <motion.nav
                            className="px-3 pb-3 flex-none"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                        >
                            <p className="px-3 text-xs font-bold text-muted-foreground/70 mb-2 uppercase tracking-wider">
                                Features
                            </p>
                            <div className="space-y-1">
                                {featureLinks.map((item) => (
                                    <NavItem
                                        key={item.path}
                                        icon={item.icon}
                                        label={item.label}
                                        badge={item.badge}
                                        active={activePath?.startsWith(item.path)}
                                        onClick={() => onNavigate(item.path)}
                                    />
                                ))}
                            </div>
                        </motion.nav>

                        {/* History */}
                        {conversations.length > 0 && (
                            <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between px-3 mb-3">
                                    <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                                        History
                                    </p>
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
                                        {filteredConversations.length}
                                    </span>
                                </div>

                                <motion.div
                                    className="space-y-2 pb-4"
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {filteredConversations.map((chat, idx) => (
                                            <ChatItem
                                                key={chat.id}
                                                chat={chat}
                                                index={idx}
                                                isActive={currentChatId === chat.id}
                                                isEditing={editingChatId === chat.id}
                                                editTitle={editTitle}
                                                onSelect={onSelectChat}
                                                onStartEdit={startEditing}
                                                onSaveEdit={saveEdit}
                                                onCancelEdit={cancelEdit}
                                                onDelete={onDeleteChat}
                                                setEditTitle={setEditTitle}
                                            />
                                        ))}
                                    </AnimatePresence>

                                    {filteredConversations.length === 0 && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="px-3 py-8 text-center text-sm text-muted-foreground"
                                        >
                                            No chats match "{searchTerm}"
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>
                        )}

                        {/* Footer */}
                        <motion.div
                            className="p-4 border-t border-border/50 flex items-center justify-between gap-3 flex-none bg-background/95"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary shadow-inner">
                                    G
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Guest User</p>
                                    <p className="text-xs text-muted-foreground">Free Plan</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <motion.button
                                    onClick={onClose}
                                    className="p-2.5 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors hidden md:block"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="Collapse sidebar"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </motion.button>
                                <motion.button
                                    onClick={() => onNavigate('/settings')}
                                    className="p-2.5 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                                    whileHover={{ scale: 1.05, rotate: 90 }}
                                    whileTap={{ scale: 0.95 }}
                                    title="Settings"
                                >
                                    <Settings className="h-5 w-5" />
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default Sidebar;
