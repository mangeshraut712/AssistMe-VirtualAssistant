import { useState, useEffect, Suspense, lazy } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
// Quick action icons removed as homepage quick actions are hidden

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ChatArea from './components/layout/ChatArea';

// Feature Modals (Lazy Loaded)
const SettingsModal = lazy(() => import('./components/features/SettingsModal'));
const UnifiedToolsPanel = lazy(() => import('./components/features/UnifiedToolsPanel'));
const GrokipediaPanel = lazy(() => import('./components/features/GrokipediaPanel'));
const AdvancedVoiceMode = lazy(() => import('./components/features/AdvancedVoiceMode'));
const FileUploadPanel = lazy(() => import('./components/features/FileUploadPanel'));
const ImageGenerationPanel = lazy(() => import('./components/features/ImageGenerationPanel'));
const SpeedtestPanel = lazy(() => import('./components/features/SpeedtestPanel'));

const MODELS = [
    // Default / Featured
    { id: 'x-ai/grok-4.1-fast:free', name: 'xAI: Grok 4.1 Fast (Free)', provider: 'xAI', free: true },

    // Voice-Optimized with Gemini 2.5 Native Audio (December 2025)
    { id: 'google/gemini-2.5-flash', name: '🎤 Gemini 2.5 Flash (Native Audio)', provider: 'Google', free: false, voiceOptimized: true, nativeAudio: true },
    { id: 'google/gemini-2.0-flash-001:free', name: '🎤 Gemini 2.0 Flash (Free)', provider: 'Google', free: true, voiceOptimized: true },

    // Free Models (Priority 1)
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B Instruct (Free)', provider: 'Meta', free: true },
    { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'NVIDIA: Nemotron Nano 9B V2 (Free)', provider: 'NVIDIA', free: true },
    { id: 'nex-agi/deepseek-v3.1-nex-n1:free', name: 'Nex AGI: DeepSeek V3.1 Nex N1 (Free)', provider: 'Nex AGI', free: true },
    { id: 'amazon/nova-2-lite-v1:free', name: 'Amazon: Nova 2 Lite (Free)', provider: 'Amazon', free: true },
    { id: 'google/gemma-3-27b-it:free', name: 'Google: Gemma 3 27B IT (Free)', provider: 'Google', free: true },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA: Nemotron Nano 12B V2 VL (Free)', provider: 'NVIDIA', free: true },
    { id: 'meituan/longcat-flash-chat:free', name: 'Meituan: LongCat Flash Chat (Free)', provider: 'Meituan', free: true },
    { id: 'alibaba/tongyi-deepresearch-30b-a3b:free', name: 'Alibaba: Tongyi DeepResearch 30B A3B (Free)', provider: 'Alibaba', free: true },

    // Premium Models (Priority 2)
    { id: 'google/gemini-2.5-pro', name: 'Google: Gemini 2.5 Pro', provider: 'Google', free: false },
    { id: 'x-ai/grok-code-fast-1', name: 'xAI: Grok Code Fast 1', provider: 'xAI', free: false },
    { id: 'perplexity/sonar', name: 'Perplexity: Sonar', provider: 'Perplexity', free: false },
    { id: 'anthropic/claude-3-haiku', name: 'Anthropic Claude 3 Haiku', provider: 'Anthropic', free: false },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', provider: 'OpenAI', free: false },
];



const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
    </div>
);

function App() {
    const navigate = useNavigate();
    const location = useLocation();

    // State Management
    const [conversations, setConversations] = useState(() => {
        const saved = localStorage.getItem('conversations');
        return saved ? JSON.parse(saved) : [{ id: Date.now(), title: 'New Chat', messages: [] }];
    });
    const [currentChatId, setCurrentChatId] = useState(() => {
        const saved = localStorage.getItem('currentChatId');
        return saved ? Number(saved) : (conversations && conversations.length > 0 ? conversations[0].id : Date.now());
    });

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('conversations', JSON.stringify(conversations));
        localStorage.setItem('currentChatId', currentChatId);
    }, [conversations, currentChatId]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('x-ai/grok-4.1-fast:free');
    const [showSidebar, setShowSidebar] = useState(() => {
        // Show sidebar by default on desktop (md breakpoint is 768px)
        return typeof window !== 'undefined' && window.innerWidth >= 768;
    });

    // Derived state for current messages
    const currentConversation = conversations.find(c => c.id === currentChatId) || conversations[0];
    const messages = currentConversation.messages;

    const [settings, setSettings] = useState({
        language: 'en',
        theme: 'light',
        advanced: false,
        backendUrl: '' // Empty string for relative path (proxy)
    });

    // Initialize marked
    useEffect(() => {
        marked.setOptions({ breaks: true, gfm: true });
    }, []);

    // Theme handler
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        const theme = settings.theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : settings.theme;
        root.classList.add(theme);
    }, [settings.theme]);

    // Keep viewport height accurate on mobile Safari/Chrome
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncAppHeight = () => {
            document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        };

        syncAppHeight();
        window.addEventListener('resize', syncAppHeight);
        window.addEventListener('orientationchange', syncAppHeight);
        return () => {
            window.removeEventListener('resize', syncAppHeight);
            window.removeEventListener('orientationchange', syncAppHeight);
        };
    }, []);

    // Chat Management
    const createNewChat = () => {
        const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
        setConversations(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setShowSidebar(false); // Close sidebar on mobile after creating new chat
        navigate('/');
    };

    const selectChat = (chatId) => {
        setCurrentChatId(chatId);
        setShowSidebar(false); // Close sidebar on mobile after selecting chat
        navigate('/');
    };

    const renameChat = (chatId, newTitle) => {
        setConversations(prev => prev.map(c =>
            c.id === chatId ? { ...c, title: newTitle } : c
        ));
    };

    const deleteChat = (chatId) => {
        const newConversations = conversations.filter(c => c.id !== chatId);
        if (newConversations.length === 0) {
            const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
            setConversations([newChat]);
            setCurrentChatId(newChat.id);
        } else {
            setConversations(newConversations);
            if (currentChatId === chatId) {
                setCurrentChatId(newConversations[0].id);
            }
        }
    };

    const updateCurrentChatMessages = (newMessages) => {
        setConversations(prev => prev.map(conv =>
            conv.id === currentChatId
                ? { ...conv, messages: newMessages, title: newMessages.length > 0 && conv.title === 'New Chat' ? newMessages[0].content.slice(0, 30) + '...' : conv.title }
                : conv
        ));
    };

    const featureRoutes = {
        imageGen: '/imagine',
        voiceMode: '/voice',
        grokipedia: '/grokipedia',
        aiStudio: '/ai-studio',
        speedtest: '/speedtest',
        fileUpload: '/files',
        settings: '/settings'
    };

    // Quick Action Handler
    const handleQuickAction = (action) => {
        if (action.key && featureRoutes[action.key]) {
            navigate(featureRoutes[action.key]);
            return;
        }
        if (action.text) {
            setInput(action.text);
        }
    };

    // Send Message (Streaming Implementation)
    const sendMessage = async (text = input) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text };
        const updatedMessages = [...messages, userMsg];

        // Optimistically update UI with user message
        updateCurrentChatMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        // Create a placeholder for the assistant's response
        const assistantMsg = { role: 'assistant', content: '' };
        const messagesWithPlaceholder = [...updatedMessages, assistantMsg];
        updateCurrentChatMessages(messagesWithPlaceholder);

        try {
            const response = await fetch(`${settings.backendUrl}/api/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
                    model: selectedModel,
                    preferred_language: settings.language
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || response.statusText);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            let buffer = '';
            const startTime = Date.now();
            let firstTokenTime = null;
            let metadata = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                // Keep the last line in the buffer if it's incomplete
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.content) {
                                if (!firstTokenTime) firstTokenTime = Date.now();
                                assistantContent += data.content;
                                // Update the UI with the accumulated content
                                updateCurrentChatMessages([
                                    ...updatedMessages,
                                    {
                                        ...assistantMsg,
                                        content: assistantContent,
                                        metadata: metadata ? {
                                            ...metadata,
                                            latency: firstTokenTime ? firstTokenTime - startTime : 0,
                                            totalTime: Date.now() - startTime
                                        } : null
                                    }
                                ]);
                            } else if (data.metadata) {
                                metadata = data.metadata;
                                updateCurrentChatMessages([
                                    ...updatedMessages,
                                    {
                                        ...assistantMsg,
                                        content: assistantContent,
                                        metadata: {
                                            ...metadata,
                                            latency: firstTokenTime ? firstTokenTime - startTime : 0,
                                            totalTime: Date.now() - startTime
                                        }
                                    }
                                ]);
                            } else if (data.error) {
                                throw new Error(data.error.message || 'Stream error');
                            }
                        } catch (e) {
                            console.warn('Error parsing stream data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            updateCurrentChatMessages([
                ...updatedMessages,
                { role: 'assistant', content: `Error: ${error.message}. Please try again.` }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Render Markdown Content
    const renderContent = (content) => {
        try {
            const html = marked.parse(String(content ?? ''));
            const safeHtml = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
            return <div dangerouslySetInnerHTML={{ __html: safeHtml }} className="prose dark:prose-invert max-w-none" />;
        } catch {
            return <div>{content}</div>;
        }
    };



    return (
        <div
            className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20"
            style={{ height: 'var(--app-height, 100vh)' }}
        >
            <Sidebar
                show={showSidebar}
                onClose={() => setShowSidebar(false)}
                onNewChat={createNewChat}
                onNavigate={(path) => {
                    navigate(path);
                    setShowSidebar(false);
                }}
                conversations={conversations}
                currentChatId={currentChatId}
                onSelectChat={selectChat}
                onRenameChat={renameChat}
                onDeleteChat={deleteChat}
                activePath={location.pathname}
            />

            <div className={`flex-1 flex flex-col relative min-w-0 transition-all duration-300 ${showSidebar ? 'md:ml-96' : 'md:ml-0'
                }`}>
                <Header onOpenSidebar={() => setShowSidebar(true)} showSidebar={showSidebar} />

                {/* Main content area - below fixed header */}
                <div className="flex-1 flex flex-col pt-14 overflow-hidden">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <ChatArea
                                    messages={messages}
                                    isLoading={isLoading}
                                    renderContent={renderContent}
                                    showWelcome={messages.length === 0}
                                    onQuickAction={handleQuickAction}
                                    inputProps={{
                                        input,
                                        setInput,
                                        isLoading,
                                        sendMessage,
                                        onFileUpload: () => navigate(featureRoutes.fileUpload),
                                        onVoiceTranscription: (text) => setInput(text),
                                        onOpenVoiceMode: () => navigate(featureRoutes.voiceMode),
                                        models: MODELS,
                                        selectedModel,
                                        onModelChange: (e) => setSelectedModel(e.target.value)
                                    }}
                                />
                            }
                        />
                        <Route
                            path="/imagine"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <ImageGenerationPanel
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                    />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/voice"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <AdvancedVoiceMode
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                        backendUrl={settings.backendUrl}
                                    />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/grokipedia"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <GrokipediaPanel
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                        backendUrl={settings.backendUrl}
                                    />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/ai-studio"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <UnifiedToolsPanel
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                        backendUrl={settings.backendUrl}
                                    />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/files"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <FileUploadPanel
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                        onFileProcess={(results) => console.log('Files processed:', results)}
                                    />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/speedtest"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <SpeedtestPanel
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                        backendUrl={settings.backendUrl}
                                    />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/settings"
                            element={
                                <Suspense fallback={<LoadingOverlay />}>
                                    <SettingsModal
                                        isOpen={true}
                                        onClose={() => navigate('/')}
                                        settings={settings}
                                        onSettingsChange={(key, value) => setSettings(prev => ({ ...prev, [key]: value }))}
                                    />
                                </Suspense>
                            }
                        />
                    </Routes>
                </div>


            </div>
        </div>
    );
}

export default App;
