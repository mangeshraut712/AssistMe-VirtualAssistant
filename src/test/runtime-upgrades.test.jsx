import { act, render } from '@testing-library/react';
import { createElement, version as reactVersion } from 'react';
import { createRoot } from 'react-dom/client';
import { version as reactDomVersion } from 'react-dom';
import * as icons from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

const USED_ICONS = [
    'Activity',
    'AlertTriangle',
    'AlignLeft',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowRightLeft',
    'ArrowUp',
    'AudioLines',
    'AudioWaveform',
    'Award',
    'BarChart2',
    'BookA',
    'BookOpen',
    'Bot',
    'Brain',
    'Briefcase',
    'Bug',
    'Check',
    'CheckCircle',
    'ChevronDown',
    'ChevronLeft',
    'ChevronRight',
    'ChevronUp',
    'Clock',
    'Code2',
    'Command',
    'Copy',
    'Cpu',
    'Crown',
    'DollarSign',
    'Download',
    'Edit2',
    'ExternalLink',
    'File',
    'FileDown',
    'FileText',
    'Gamepad2',
    'Gauge',
    'Globe',
    'Globe2',
    'History',
    'Home',
    'Image',
    'Keyboard',
    'Languages',
    'Layers',
    'LayoutGrid',
    'Lightbulb',
    'Loader2',
    'MapPin',
    'Maximize2',
    'Menu',
    'MessageSquare',
    'Mic',
    'MicOff',
    'Monitor',
    'Moon',
    'MoveHorizontal',
    'Newspaper',
    'Palette',
    'Paperclip',
    'PenTool',
    'Play',
    'Plus',
    'RefreshCw',
    'RotateCcw',
    'ScanText',
    'Search',
    'Server',
    'Settings',
    'Settings2',
    'Share2',
    'Sparkles',
    'SplitSquareHorizontal',
    'StopCircle',
    'Sun',
    'Target',
    'Terminal',
    'Trash2',
    'TrendingUp',
    'Type',
    'Upload',
    'Users',
    'Video',
    'Volume2',
    'VolumeX',
    'Wand2',
    'Waves',
    'X',
    'Zap',
];

const REMOVED_BRAND_ICONS = [
    'Chromium',
    'Codepen',
    'Codesandbox',
    'Dribbble',
    'Facebook',
    'Figma',
    'Framer',
    'Github',
    'Gitlab',
    'Instagram',
    'Linkedin',
    'Pocket',
    'RailSymbol',
    'Slack',
];

function isAtLeast(version, major, minor, patch) {
    const [maj, min, pat] = version.split('.').map(Number);
    if (maj !== major) {
        return maj > major;
    }
    if (min !== minor) {
        return min > minor;
    }
    return pat >= patch;
}

describe('React 19.3', () => {
    it('keeps react and react-dom on the same 19.3 release', async () => {
        expect(isAtLeast(reactVersion, 19, 3, 1)).toBe(true);
        expect(reactDomVersion).toBe(reactVersion);

        const host = document.createElement('div');
        document.body.appendChild(host);
        const root = createRoot(host);
        await act(async () => {
            root.render(createElement('p', null, 'assistme'));
        });

        expect(host.textContent).toBe('assistme');
        await act(async () => {
            root.unmount();
        });
        host.remove();
    });
});

describe('lucide-react 1', () => {
    it('still exports every icon the interface renders', () => {
        USED_ICONS.forEach((name) => {
            const Icon = icons[name];
            if (!Icon) {
                throw new Error(`Missing lucide icon: ${name}`);
            }
            const { container, unmount } = render(createElement(Icon));
            const svg = container.querySelector('svg');
            if (!svg) {
                throw new Error(`Icon ${name} did not render an svg`);
            }
            unmount();
        });
    });

    it('hides decorative icons and keeps an explicit label', () => {
        const decorative = render(createElement(icons.Sparkles));
        expect(decorative.container.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
        decorative.unmount();

        const labeled = render(createElement(icons.Mic, { 'aria-label': 'Start microphone' }));
        const svg = labeled.container.querySelector('svg');
        expect(svg.getAttribute('aria-label')).toBe('Start microphone');
        expect(svg.getAttribute('aria-hidden')).not.toBe('true');
        labeled.unmount();
    });

    it('does not export the brand icons removed in v1', () => {
        REMOVED_BRAND_ICONS.forEach((name) => {
            if (icons[name] !== undefined) {
                throw new Error(`Brand icon ${name} should have been removed in lucide-react 1`);
            }
        });
    });
});

describe('jsdom 30', () => {
    it('exposes CSS.supports and resolves absolute lengths to pixels', () => {
        expect(typeof CSS.supports).toBe('function');
        expect(CSS.supports('display', 'grid')).toBe(true);
        expect(typeof CSS.escape).toBe('function');

        const el = document.createElement('div');
        el.style.marginLeft = '1in';
        document.body.appendChild(el);
        expect(getComputedStyle(el).marginLeft).toBe('96px');
        el.remove();
    });

    it('fires a PointerEvent from element.click() that is still a MouseEvent', () => {
        const button = document.createElement('button');
        const seen = [];
        button.addEventListener('click', (event) => {
            seen.push(event);
        });
        document.body.appendChild(button);
        button.click();

        expect(seen).toHaveLength(1);
        expect(seen[0]).toBeInstanceOf(PointerEvent);
        expect(seen[0]).toBeInstanceOf(MouseEvent);
        button.remove();
    });
});

describe('vitest 5', () => {
    const calls = vi.fn();

    it('records a call made in this test', () => {
        calls();
        expect(calls).toHaveBeenCalledTimes(1);
    });

    it('clears mock history before the next test', () => {
        expect(calls).not.toHaveBeenCalled();
        calls();
        expect(calls).toHaveBeenCalledTimes(1);
    });
});
