# 📁 AssistMe Source Directory Structure

This document describes the organization of the `src/` directory.

## 📂 Directory Overview

```
src/
├── components/          # React components
│   ├── features/        # Feature panel components
│   ├── layout/          # Core layout components
│   ├── ui/              # Reusable UI primitives
│   ├── ErrorBoundary.jsx
│   └── index.js         # Barrel export
│
├── config/              # Configuration files
│   ├── design.config.js
│   └── voice-detection.config.js
│
├── constants/           # App-wide constants
│   └── index.js         # API, models, features, etc.
│
├── context/             # React contexts
│   ├── ThemeContext.jsx
│   └── index.js
│
├── hooks/               # Custom React hooks
│   ├── useAdvancedVoiceDetection.js
│   ├── useResponsive.js
│   └── index.js
│
├── lib/                 # Utility libraries
│   ├── apiClient.js     # API client wrapper
│   ├── hooks.js         # Core utility hooks
│   └── utils.js         # Utility functions
│
├── pages/               # Page-level components
│   └── BenchmarkPage.jsx
│
├── services/            # API service wrappers
│   └── index.js         # Chat, Knowledge, Image, Speech services
│
├── utils/               # Animation utilities
│   └── animations.js
│
├── App.jsx              # Main application component
├── main.jsx             # Entry point
└── index.css            # Global styles with design tokens
```

## 🏗️ Architecture Principles

### 1. **Component Organization**
- **`features/`** - Self-contained feature panels (Grokipedia, Imagine, Voice, etc.)
- **`layout/`** - App shell components (Sidebar, Header, ChatArea)
- **`ui/`** - Reusable primitives (Button, Card, Input, etc.)

### 2. **Clean Imports with Barrel Exports**
```javascript
// Instead of:
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';

// Use:
import { Button, Card } from '@/components/ui';
```

### 3. **Services Layer**
All API calls go through the services layer:
```javascript
import { chatService, knowledgeService } from '@/services';

// Stream chat
await chatService.streamChat({ messages, model, onDelta });

// Generate knowledge article
await knowledgeService.streamArticle({ query, onContent });
```

### 4. **Constants for Configuration**
```javascript
import { AI_MODELS, FEATURES, STORAGE_KEYS } from '@/constants';

// Access model info
const model = AI_MODELS.GEMINI_FLASH;

// Access storage keys
localStorage.getItem(STORAGE_KEYS.THEME);
```

### 5. **Custom Hooks**
```javascript
import { useLocalStorage, useDebounce, useResponsive } from '@/hooks';

const [theme, setTheme] = useLocalStorage('theme', 'dark');
const debouncedSearch = useDebounce(searchTerm, 300);
const { isMobile, isTablet } = useResponsive();
```

## 📦 Key Files

| File | Purpose |
|------|---------|
| `App.jsx` | Main app with routing and state management |
| `main.jsx` | React entry point |
| `index.css` | Global styles, CSS variables, design tokens |
| `constants/index.js` | App-wide constants and configuration |
| `services/index.js` | API service wrappers |
| `context/ThemeContext.jsx` | Theme (dark/light mode) context |

## 🎨 Design System

The design system is defined in `index.css` with CSS custom properties:

- **Colors**: `--primary`, `--secondary`, `--accent`, etc.
- **Spacing**: `--space-1` through `--space-10`
- **Typography**: `--font-sans`, `--font-serif`, `--font-mono`
- **Borders**: `--radius-sm`, `--radius-md`, `--radius-lg`
- **Shadows**: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

## 🔧 Development Guidelines

1. **Create new features** in `components/features/`
2. **Add reusable UI** in `components/ui/`
3. **Add API calls** in `services/index.js`
4. **Add constants** in `constants/index.js`
5. **Add hooks** in `hooks/` folder
6. **Update barrel exports** when adding new files
