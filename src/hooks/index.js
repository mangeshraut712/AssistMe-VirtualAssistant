/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CUSTOM HOOKS EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Central barrel export for all custom React hooks.
 * Import from '@/hooks' for cleaner imports.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Hooks (from lib)
// ─────────────────────────────────────────────────────────────────────────────
export {
    useLocalStorage,
    useEffectOnce,
    useBoolean,
    useDebounce,
    useMediaQuery,
    useClickOutside,
    useKeyPress,
    useIsomorphicLayoutEffect,
    useEventListener,
    useCopyToClipboard,
} from '@/lib/hooks';

// ─────────────────────────────────────────────────────────────────────────────
// Voice & Media Hooks
// ─────────────────────────────────────────────────────────────────────────────
export { useAdvancedVoiceDetection } from './useAdvancedVoiceDetection';
export { useResponsive } from './useResponsive';
