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
    X
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

const Sidebar = ({ show, onClose, onNewChat, openModal, conversations = [], currentChatId, onSelectChat, onRenameChat, onDeleteChat }) => {
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

    return (
        <>
            {show && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed top-0 left-0 bottom-0 w-64 bg-[hsl(var(--sidebar-bg))] border-r border-border/70 flex flex-col overflow-hidden z-50 transition-transform duration-300 md:translate-x-0 md:static ${show ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header - Fixed */}
                <div className="flex items-center gap-3 px-3 pt-4 pb-3 flex-none">
                    <img
                        src="/assets/logo.png"
                        alt="AssistMe logo"
                        className="h-10 w-10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] object-cover bg-white"
                    />
                    <div>
                        <p className="text-lg font-semibold leading-5">AssistMe</p>
                        <p className="text-xs text-muted-foreground">All-in-one</p>
                    </div>
                </div>

                {/* New Chat & Search - Fixed */}
                <div className="px-3 pb-3 space-y-2 flex-none">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-3 py-2 font-medium shadow-sm hover:opacity-90 transition-opacity"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span>New Chat</span>
                    </button>

                    <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-border rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                            id="chat-search"
                            name="chat-search"
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search chats..."
                            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                            autoComplete="off"
                        />
                    </div>
                </div>

                {/* Features - Fixed */}
                <nav className="px-3 space-y-1 flex-none">
                    <div className="pb-2">
                        <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Features</p>
                        <div className="space-y-1">
                            <NavItem icon={ImageIcon} label="Imagine" onClick={() => openModal('imageGen')} />
                            <NavItem icon={Mic} label="Voice Mode" onClick={() => openModal('voiceMode')} />
                            <NavItem icon={BookOpen} label="Grokipedia" onClick={() => openModal('grokipedia')} />
                            <NavItem icon={Languages} label="AI4Bharat" onClick={() => openModal('ai4bharat')} />
                            <NavItem icon={Wand2} label="Writing Tools" onClick={() => openModal('grammar')} />
                            <NavItem icon={Gauge} label="Speedtest" onClick={() => openModal('speedtest')} />
                        </div>
                    </div>
                </nav>

                {/* History - Scrollable */}
                {conversations.length > 0 && (
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 border-t border-border/50">
                        <div className="px-3 flex items-center justify-between sticky top-0 bg-[hsl(var(--sidebar-bg))] py-3 z-20 border-b border-border/60">
                            <p className="text-xs font-bold tracking-widest text-muted-foreground">HISTORY</p>
                            <span className="text-[12px] text-muted-foreground">
                                {filteredConversations.length} chats
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
                                            <button onClick={saveEdit} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check className="h-4 w-4" /></button>
                                            <button onClick={cancelEdit} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onSelectChat(chat.id)}
                                            className={`w-full text-left px-3 py-3 rounded-2xl border transition-all duration-150 flex items-center gap-3 relative ${currentChatId === chat.id
                                                ? 'border-foreground/20 bg-foreground/5 shadow-sm'
                                                : 'border-transparent bg-white dark:bg-neutral-900 hover:border-foreground/10 hover:bg-foreground/5'
                                                }`}
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border flex-shrink-0">
                                                <MessageSquare className="h-[16px] w-[16px]" />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-16">
                                                <p className="text-sm font-semibold truncate">{chat.title || 'Untitled'}</p>
                                                <p className="text-[11px] text-muted-foreground">Chat #{idx + 1}</p>
                                            </div>

                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditing(chat);
                                                    }}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                                    aria-label="Rename chat"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteChat(chat.id);
                                                    }}
                                                    className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                    aria-label="Delete chat"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filteredConversations.length === 0 && (
                                <div className="px-3 py-4 text-sm text-muted-foreground">
                                    No chats match “{searchTerm}”
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-border/60 flex items-center justify-between gap-3 flex-none">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                            G
                        </div>
                        <div>
                            <p className="text-sm font-medium leading-tight">Guest</p>
                        </div>
                    </div>
                    <button
                        onClick={() => openModal('settings')}
                        className="p-2 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Settings className="h-[18px] w-[18px]" />
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
