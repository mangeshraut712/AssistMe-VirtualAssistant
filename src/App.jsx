import React, { useState, useEffect, Suspense, lazy } from 'react';
import { marked } from 'marked';
import { Code, Image, MessageSquare } from 'lucide-react';
// Quick action icons removed as homepage quick actions are hidden

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ChatArea from './components/layout/ChatArea';
import InputArea from './components/layout/InputArea';

// Feature Modals (Lazy Loaded)
const SettingsModal = lazy(() => import('./components/features/SettingsModal'));
const AI4BharatPanel = lazy(() => import('./components/features/AI4BharatPanel'));
const GrokipediaPanel = lazy(() => import('./components/features/GrokipediaPanel'));
const AdvancedVoiceMode = lazy(() => import('./components/features/AdvancedVoiceMode'));
const FileUploadPanel = lazy(() => import('./components/features/FileUploadPanel'));
const ImageGenerationPanel = lazy(() => import('./components/features/ImageGenerationPanel'));
const GrammarlyQuillbotPanel = lazy(() => import('./components/features/GrammarlyQuillbotPanel'));
const SpeedtestPanel = lazy(() => import('./components/features/SpeedtestPanel'));

const MODELS = [
    // Voice-Optimized (Priority 0)
    { id: 'google/gemini-2.0-flash-001:free', name: '🎤 Google: Gemini 2.0 Flash (Free)', provider: 'Google', free: true, voiceOptimized: true },

    // Free Models (Priority 1)
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B Instruct (Free)', provider: 'Meta', free: true },
    { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'NVIDIA Nemotron Nano 9B V2 (Free)', provider: 'NVIDIA', free: true },
    { id: 'google/gemma-3-27b-it:free', name: 'Google: Gemma 3 27B IT (Free)', provider: 'Google', free: true },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA: Nemotron Nano 12B V2 VL (Free)', provider: 'NVIDIA', free: true },
    { id: 'meituan/longcat-flash-chat:free', name: 'Meituan: LongCat Flash Chat (Free)', provider: 'Meituan', free: true },
    { id: 'alibaba/tongyi-deepresearch-30b-a3b:free', name: 'Alibaba: Tongyi DeepResearch 30B A3B (Free)', provider: 'Alibaba', free: true },

    // Premium Models (Priority 2)
    { id: 'x-ai/grok-code-fast-1', name: 'xAI: Grok Code Fast 1', provider: 'xAI', free: false },
    { id: 'x-ai/grok-4.1-fast', name: 'xAI: Grok 4.1 Fast', provider: 'xAI', free: false },
    { id: 'perplexity/sonar', name: 'Perplexity: Sonar', provider: 'Perplexity', free: false },
    { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', provider: 'Google', free: false },
    { id: 'anthropic/claude-3-haiku', name: 'Anthropic Claude 3 Haiku', provider: 'Anthropic', free: false },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', provider: 'OpenAI', free: false },
];

const QUICK_ACTIONS = [
    { icon: MessageSquare, label: 'Chat', text: 'Hello, how can you help me?' },
    { icon: Code, label: 'Code', text: 'Write a Python script to...' },
    { icon: Image, label: 'Image', key: 'imageGen' }
];

function App() {
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
    const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-001:free');
    const [showSidebar, setShowSidebar] = useState(false);

    // Derived state for current messages
    const currentConversation = conversations.find(c => c.id === currentChatId) || conversations[0];
    const messages = currentConversation.messages;

    // Modal States
    const [modals, setModals] = useState({
        settings: false,
        ai4bharat: false,
        grokipedia: false,
        voiceMode: false,
        fileUpload: false,
        imageGen: false,
        grammar: false,
        speedtest: false
    });

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

    // Modal Control
    const openModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: true }));
    const closeModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: false }));

    // Chat Management
    const createNewChat = () => {
        const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
        setConversations(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setShowSidebar(false); // Close sidebar on mobile after creating new chat
    };

    const selectChat = (chatId) => {
        setCurrentChatId(chatId);
        setShowSidebar(false); // Close sidebar on mobile after selecting chat
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

    // Quick Action Handler
    const handleQuickAction = (action) => {
        if (action.key) {
            openModal(action.key);
        } else if (action.text) {
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
                                assistantContent += data.content;
                                // Update the UI with the accumulated content
                                updateCurrentChatMessages([
                                    ...updatedMessages,
                                    { ...assistantMsg, content: assistantContent }
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
            const html = marked.parse(content);
            return <div dangerouslySetInnerHTML={{ __html: html }} className="prose dark:prose-invert max-w-none" />;
        } catch {
            return <div>{content}</div>;
        }
    };

    // Voice Conversation Handler
    const handleVoiceConversation = async (text) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text };
        const updatedMessages = [...messages, userMsg];
        updateCurrentChatMessages(updatedMessages);

        try {
            const response = await fetch(`${settings.backendUrl}/api/chat/text`, {
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

            const data = await response.json();

            if (data.response) {
                const assistantMsg = {
                    role: 'assistant',
                    content: data.response,
                    latency: 0 // We don't track latency for voice yet
                };
                updateCurrentChatMessages([...updatedMessages, assistantMsg]);
                return data.response;
            } else {
                throw new Error('No response from AI');
            }
        } catch (error) {
            console.error('Voice chat error:', error);
            return "I'm sorry, I encountered an error. Please try again.";
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
            <Sidebar
                show={showSidebar}
                onClose={() => setShowSidebar(false)}
                onNewChat={createNewChat}
                openModal={openModal}
                conversations={conversations}
                currentChatId={currentChatId}
                onSelectChat={selectChat}
                onRenameChat={renameChat}
                onDeleteChat={deleteChat}
            />

            <div className="flex-1 flex flex-col relative md:ml-80">
                <Header onOpenSidebar={() => setShowSidebar(true)} />

                <div className="flex-1 overflow-y-auto scroll-smooth pt-16">
                    <ChatArea
                        messages={messages}
                        isLoading={isLoading}
                        renderContent={renderContent}
                        showWelcome={messages.length === 0}
                        quickActions={QUICK_ACTIONS}
                        onQuickAction={handleQuickAction}
                        inputProps={{
                            input,
                            setInput,
                            isLoading,
                            sendMessage,
                            onFileUpload: () => openModal('fileUpload'),
                            onVoiceTranscription: (text) => setInput(text),
                            onOpenVoiceMode: () => openModal('voiceMode'),
                            models: MODELS,
                            selectedModel,
                            onModelChange: (e) => setSelectedModel(e.target.value)
                        }}
                    />
                </div>


            </div>

            {/* Modals */}
            <Suspense fallback={
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
            }>
                <SettingsModal
                    isOpen={modals.settings}
                    onClose={() => closeModal('settings')}
                    settings={settings}
                    onSettingsChange={(key, value) => setSettings(prev => ({ ...prev, [key]: value }))}
                />

                <AI4BharatPanel
                    isOpen={modals.ai4bharat}
                    onClose={() => closeModal('ai4bharat')}
                />

                <GrokipediaPanel
                    isOpen={modals.grokipedia}
                    onClose={() => closeModal('grokipedia')}
                />

                <AdvancedVoiceMode
                    isOpen={modals.voiceMode}
                    onClose={() => closeModal('voiceMode')}
                    onSendMessage={handleVoiceConversation}
                    settings={settings}
                    selectedModel={selectedModel}
                />

                <FileUploadPanel
                    isOpen={modals.fileUpload}
                    onClose={() => closeModal('fileUpload')}
                    onFileProcess={(results) => console.log('Files processed:', results)}
                />

                <ImageGenerationPanel
                    isOpen={modals.imageGen}
                    onClose={() => closeModal('imageGen')}
                />

                <GrammarlyQuillbotPanel
                    isOpen={modals.grammar}
                    onClose={() => closeModal('grammar')}
                    model={selectedModel}
                />

                <SpeedtestPanel
                    isOpen={modals.speedtest}
                    onClose={() => closeModal('speedtest')}
                />
            </Suspense>
        </div>
    );
}

export default App;
