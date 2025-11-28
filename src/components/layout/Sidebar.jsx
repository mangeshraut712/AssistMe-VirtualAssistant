import React, { useMemo, useState } from 'react';
import {
    Search,
    BookOpen,
    MessageSquare,
    Mic,
    Image as ImageIcon,
    Settings,
    Languages,
    Wand2,
    Gauge,
    Trash2,
    Edit2,
    Check,
    X,
    ChevronLeft
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all duration-200 ${active
            ? 'bg-foreground/5 text-foreground font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
            }`}
    >
        <Icon className="h-[18px] w-[18px]" />
        <span>{label}</span>
    </button>
);

const Sidebar = ({ show, onClose, onNewChat, onNavigate, conversations = [], currentChatId, onSelectChat, onRenameChat, onDeleteChat, activePath }) => {
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
        { icon: ImageIcon, label: 'Imagine', path: '/imagine' },
        { icon: Mic, label: 'Voice Mode', path: '/voice' },
        { icon: BookOpen, label: 'Grokipedia', path: '/grokipedia' },
        { icon: Languages, label: 'AI4Bharat', path: '/ai4bharat' },
        { icon: Wand2, label: 'Writing Tools', path: '/writing-tools' },
        { icon: Gauge, label: 'Speedtest', path: '/speedtest' },
    ];

    return (
        <>
            {show && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 w-[85vw] max-w-[320px] md:w-80 lg:w-96 bg-background/95 backdrop-blur-xl border-r border-border/70 flex flex-col overflow-hidden z-50 transition-transform duration-300 shadow-2xl ${show ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header - Fixed */}
                <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-4 landscape:py-2 flex-none safe-area-top">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/logo.png"
                            alt="AssistMe logo"
                            className="h-10 w-10 landscape:h-8 landscape:w-8 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] object-cover bg-white ring-1 ring-black/5 dark:ring-white/10"
                        />
                        <div>
                            <p className="text-lg landscape:text-base font-bold leading-none tracking-tight">AssistMe</p>
                            <p className="text-xs text-muted-foreground font-medium mt-1 landscape:hidden">All-in-one Assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="md:hidden p-2.5 landscape:p-1.5 rounded-xl bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors active:scale-95 touch-manipulation"
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* New Chat & Search - Fixed */}
                <div className="px-4 pb-4 landscape:pb-2 space-y-3 landscape:space-y-2 flex-none">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-2.5 bg-primary text-primary-foreground rounded-xl px-4 py-3 landscape:py-2 font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all touch-manipulation"
                    >
                        <MessageSquare className="h-5 w-5 landscape:h-4 landscape:w-4" />
                        <span className="landscape:text-sm">New Chat</span>
                    </button>

                    <div className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 border border-border rounded-xl px-3.5 py-2.5 landscape:py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                            id="chat-search"
                            name="chat-search"
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search chats..."
                            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/70"
                            autoComplete="off"
                        />
                    </div>
                </div>

                {/* Features - Fixed */}
                <nav className="px-3 space-y-1 flex-none overflow-y-auto max-h-[20vh] landscape:max-h-[30vh]">
                    <div className="pb-2">
                        <p className="px-3 text-xs font-bold text-muted-foreground/70 mb-2 uppercase tracking-wider landscape:mb-1">Features</p>
                        <div className="space-y-1">
                            {featureLinks.map((item) => (
                                <NavItem
                                    key={item.path}
                                    icon={item.icon}
                                    label={item.label}
                                    active={activePath?.startsWith(item.path)}
                                    onClick={() => onNavigate(item.path)}
                                />
                            ))}
                        </div>
                    </div>
                </nav>

                {/* History - Scrollable */}
                {conversations.length > 0 && (
                    <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 border-t border-border/50 overscroll-contain touch-pan-y">
                        <div className="px-3 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-xl py-3 landscape:py-2 z-20 border-b border-border/60 mb-2">
                            <p className="text-xs font-bold tracking-widest text-muted-foreground/70">HISTORY</p>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
                                {filteredConversations.length}
                            </span>
                        </div>
                        <div className="grid gap-2 pb-4">
                            {filteredConversations.map((chat, idx) => (
                                <div key={chat.id} className="relative group">
                                    {editingChatId === chat.id ? (
                                        <div className="px-3 py-2 flex items-center gap-2 bg-white dark:bg-neutral-900 rounded-2xl border border-blue-500/50 shadow-sm">
                                            <input
                                                id="chat-rename-input"
                                                name="chat-title"
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                                                autoFocus
                                                autoComplete="off"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit();
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button onClick={saveEdit} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg"><Check className="h-4 w-4" /></button>
                                            <button onClick={cancelEdit} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => onSelectChat(chat.id)}
                                            className={`w-full text-left px-3 py-3 landscape:py-2 rounded-2xl border transition-all duration-150 flex items-center gap-3 active:scale-[0.98] touch-manipulation cursor-pointer ${currentChatId === chat.id
                                                ? 'border-foreground/20 bg-foreground/5 shadow-sm'
                                                : 'border-transparent bg-white/50 dark:bg-neutral-900/30 hover:border-foreground/10 hover:bg-foreground/5'
                                                }`}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    onSelectChat(chat.id);
                                                }
                                            }}
                                        >
                                            <div className="flex h-9 w-9 landscape:h-7 landscape:w-7 items-center justify-center rounded-xl border border-border/50 bg-background/50 flex-shrink-0">
                                                <MessageSquare className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 opacity-70" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className="text-sm font-semibold truncate text-foreground/90">{chat.title || 'Untitled'}</p>
                                                    {currentChatId === chat.id && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">Active</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 landscape:hidden">Chat #{idx + 1}</p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditing(chat);
                                                    }}
                                                    className="p-2 landscape:p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                                                    aria-label="Rename chat"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteChat(chat.id);
                                                    }}
                                                    className="p-2 landscape:p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    aria-label="Delete chat"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredConversations.length === 0 && (
                                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                    <p>No chats match "{searchTerm}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-4 landscape:p-2 border-t border-border/60 flex items-center justify-between gap-3 flex-none safe-area-bottom bg-background/95 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 landscape:h-8 landscape:w-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center text-sm font-bold text-foreground shadow-inner">
                            G
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-tight">Guest User</p>
                            <p className="text-xs text-muted-foreground landscape:hidden">Free Plan</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onClose}
                            className="p-2.5 landscape:p-1.5 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors hidden md:block border border-transparent hover:border-border"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => onNavigate('/settings')}
                            className="p-2.5 landscape:p-1.5 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors active:scale-95 touch-manipulation"
                            title="Settings"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside >
        </>
    );
};

export default Sidebar;
