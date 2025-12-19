/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENT EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Central barrel export for all components.
 * Import from '@/components' for cleaner imports.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Layout Components
// ─────────────────────────────────────────────────────────────────────────────
export { ChatArea } from './layout/ChatArea';
export { Header } from './layout/Header';
export { InputArea } from './layout/InputArea';
export { MessageBubble } from './layout/MessageBubble';
export { Sidebar } from './layout/Sidebar';

// ─────────────────────────────────────────────────────────────────────────────
// Feature Panels
// ─────────────────────────────────────────────────────────────────────────────
export { default as AI4BharatPanel } from './features/AI4BharatPanel';
export { default as AdvancedVoiceMode } from './features/AdvancedVoiceMode';
export { default as FileUploadPanel } from './features/FileUploadPanel';
export { default as GrammarlyQuillbotPanel } from './features/GrammarlyQuillbotPanel';
export { default as GrokipediaPanel } from './features/GrokipediaPanel';
export { default as ImageGenerationPanel } from './features/ImageGenerationPanel';
export { default as SettingsModal } from './features/SettingsModal';
export { default as SpeedtestPanel } from './features/SpeedtestPanel';
export { default as UnifiedToolsPanel } from './features/UnifiedToolsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────────────────────
export * from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────
export { default as ErrorBoundary } from './ErrorBoundary';
