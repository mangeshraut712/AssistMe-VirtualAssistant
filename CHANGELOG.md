# Changelog

All notable changes to AssistMe Virtual Assistant will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-12-14 🎉 Major 2025 Design Upgrade

### ⚡ Breaking Changes
- Upgraded to ES2022 build target
- New component import paths via `@/` alias (shadcn/ui style)
- Framer Motion required for animated components

### 🎨 Design System - Apple & Japanese Aesthetics

#### Japanese Design Philosophy
- **Kanso (簡素)** - Simplicity and elimination of clutter
- **Ma (間)** - Negative space and breathing room in layouts
- **Wabi-sabi** - Beauty in imperfection, natural feel
- **Chōwa (調和)** - Harmony and balance

#### Apple-Style Motion
- Spring physics animations throughout the UI
- Smooth 60fps transitions with `framer-motion`
- Magnetic cursor effects for interactive elements
- Hardware-accelerated transforms

### 🏠 Premium Homepage Experience

The welcome screen has been completely redesigned with a stunning premium look:

#### Visual Elements
- **Floating Orb** - Mouse-following gradient orb background effect
- **Time-based Greeting** - Dynamic greeting based on time of day (morning/afternoon/evening/night)
- **Animated Gradient Text** - "today?" shimmer effect on headline
- **Subtle Grid Pattern** - Background visual texture

#### Hero Section
- Large bold headline "What can I help with today?"
- Descriptive subheadline for context
- **Capability Pills** showing: Multilingual, Voice Mode, Fast Responses, AI-Powered

#### Quick Action Cards
- **6 glassmorphic cards** in 2x3 grid layout:
  - Create an image (pink gradient)
  - Help me write (blue gradient)
  - Write code (green gradient)
  - Brainstorm ideas (yellow gradient)
  - Research a topic (purple gradient)
  - Summarize content (orange gradient)
- Hover effects with gradient overlay and arrow indicator
- Spring animations on hover

#### Additional Elements
- Keyboard shortcut hint (⌘ + K)
- Voice mode availability indicator
- Premium input area with glass effect



All core layout components have been upgraded with Framer Motion:

#### Sidebar (`layout/Sidebar.jsx`)
- **AnimatePresence** for smooth open/close transitions
- **Staggered list animations** for chat history
- **Active indicator** with `layoutId` animation
- **Hover micro-interactions** on nav items
- **Spring physics** for sidebar slide

#### Header (`layout/Header.jsx`)
- Entrance animation with spring physics
- AI badge with pulsing animation
- Keyboard shortcut hint (⌘K)
- Interactive logo with hover scale

#### MessageBubble (`layout/MessageBubble.jsx`)
- **AI Avatar** with bounce entrance
- **Typing indicator** with wave animation
- **Action buttons** with hover/tap variants
- **Metadata pills** with staggered appearance
- **Follow-up questions** with slide animation

#### InputArea (`layout/InputArea.jsx`)
- **Focus state** with scale animation
- **Listening indicator** with pulse effect
- **File chips** with enter/exit animations
- **Auto-resize textarea** with smooth transition
- **Send button** with loading spinner

#### ChatArea (`layout/ChatArea.jsx`)
- **Welcome screen** with staggered entrance
- **Quick action pills** with hover slide
- **Message list** with AnimatePresence
- **Typing indicator** as separate animated component
- **Gradient background** with radial pattern

### 🚀 Enhanced Feature Panels

All feature panels have been upgraded with Framer Motion and modern design:

#### Grokipedia (`features/GrokipediaPanel.jsx`)
- **Animated search** with loading spinner
- **Skeleton loading** with shimmer effect
- **TOC navigation** with active state animation
- **Topic suggestions** with hover effects
- **Copy/Share actions** with feedback
- **Article info sidebar** with word count

#### Speedtest (`features/SpeedtestPanel.jsx`)
- **Animated circular gauge** with progress arc
- **Real-time number animation** using Framer Motion
- **Glow effects** during testing
- **Stat cards** with animated values
- **Completion state** with checkmark
- **Status indicators** with icons

#### Voice Mode (`features/AdvancedVoiceMode.jsx`)
- **Audio wave visualizer** with animated bars
- **Animated orb** with state-based colors
- **Ripple effects** on listening/speaking
- **Status badges** with smooth transitions
- **Conversation history** with avatars
- **Glass morphism** design

#### Imagine (`features/ImageGenerationPanel.jsx`)
- **Animated masonry gallery** with staggered load
- **Hover overlay** with action buttons
- **Loading shimmer** skeleton
- **Floating input bar** with gradient button
- **Settings popover** with animations
- **New badge** on generated images

#### AI Studio (`features/UnifiedToolsPanel.jsx`)
- **Animated sidebar navigation**
- **Suite buttons** with hover effects
- **Mobile tab bar** with indicator
- **Content transitions** between suites
- **Glass morphism** header/footer

#### Settings (`features/SettingsModal.jsx`)
- **Modal entrance animation**
- **Theme switcher** with check indicator
- **Setting cards** with staggered appear
- **Version info** badge
- **Backdrop blur** with click-to-close


- **framer-motion** - Production-ready motion library (formerly Framer Motion)
- **@radix-ui/react-dialog** - Accessible modal dialogs
- **@radix-ui/react-dropdown-menu** - Dropdown menus
- **@radix-ui/react-tooltip** - Smart tooltips
- **@radix-ui/react-switch** - Toggle switches
- **@radix-ui/react-select** - Custom selects
- **@radix-ui/react-avatar** - Avatar component
- **@radix-ui/react-separator** - Accessible separators
- **@radix-ui/react-slot** - Composition primitive

### 🧩 shadcn/ui Components

#### New UI Components
| Component | File | Description |
|-----------|------|-------------|
| Button | `button.jsx` | CVA variants, motion-enhanced, glass & minimal styles |
| Card | `card.jsx` | MotionCard with hover elevation, GlassCard |
| Input | `input.jsx` | Animated focus states, Textarea |
| Dialog | `dialog.jsx` | Radix-based modal with spring animations |
| Badge | `badge.jsx` | Success, warning, info, subtle variants |
| Tooltip | `tooltip.jsx` | Smart positioning with animations |
| Avatar | `avatar.jsx` | Image + fallback support |
| Separator | `separator.jsx` | Horizontal/vertical dividers |

#### Motion Utilities (`motion.jsx`)
- `FadeIn`, `SlideUp`, `ScaleIn` - Animation wrappers
- `StaggerContainer`, `StaggerItem` - List animations
- `AnimateInView` - Viewport-triggered animations
- `HoverScale` - Interactive hover effects
- `Magnetic` - Cursor-following effect (Apple memoji style)
- `TypingText` - Typewriter animation
- `Shimmer` - Loading skeleton effect
- `PulseDot` - Live indicator

### ⚙️ Configuration Updates

#### Path Aliases
```javascript
// Now use @ imports (shadcn/ui style)
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

#### Files Added/Modified
- `jsconfig.json` - Path alias configuration
- `vite.config.js` - Added `@` alias, ES2022 target, framer-motion optimization
- `components.json` - shadcn/ui configuration
- `tailwind.config.cjs` - Extended animations, Inter font

### 🗂️ Project Organization
- Removed legacy `backend.log` file
- Added `*.log`, `*.db` to `.gitignore`
- Structured UI components in `src/components/ui/`
- Centralized exports in `components.jsx`

### 🔤 Typography
- Added **Inter** font family (2025 standard)
- Added **JetBrains Mono** for code
- Improved font loading with preconnect

### 🔧 Backend / FastAPI Improvements

#### New Configuration System (`config.py`)
- **Pydantic v2 Settings** - Type-safe configuration with validation
- Nested settings: Database, Redis, AI, Security, Logging
- Computed properties for database URL resolution
- Production validation (environment checks)

#### Structured Logging (`logging_config.py`)
- **structlog** integration for production JSON logs
- Console formatting for development
- Request ID tracking and context propagation
- `@log_execution_time` decorator for performance monitoring
- `LogContext` context manager for scoped logging

#### Middleware (`middleware.py`)
- `RequestContextMiddleware` - Request timing, ID propagation
- `SecurityHeadersMiddleware` - CSP, X-Frame-Options, etc.
- `ErrorHandlingMiddleware` - Graceful error handling
- `RateLimitContextMiddleware` - Client identification

#### Dependencies (`dependencies.py`)
- Centralized FastAPI dependency injection
- `DBSession`, `CurrentUser`, `AIProvider` dependencies
- Pagination and sorting utilities
- Rate limiting integration

#### Improved Providers (`providers/base.py`)
- Dataclasses for responses: `ChatCompletion`, `StreamChunk`, `Usage`
- Custom exceptions: `ProviderError`, `RateLimitError`, etc.
- `@with_retry` decorator with exponential backoff
- Generic typing with `TypeVar`

#### Health Routes (`routes/health.py`)
- `/health` - Comprehensive health check
- `/health/live` - Kubernetes liveness probe
- `/health/ready` - Kubernetes readiness probe
- `/health/status` - API status and config
- `/health/metrics` - Basic application metrics

#### Updated Schemas (`schemas.py`)
- Pydantic v2 with `model_config`
- `MessageRole` and `ModelProvider` enums
- Strict validation with `field_validator`
- Password strength validation
- `computed_field` for derived properties

### 📦 Backend Dependencies Updated
| Package | Version | Purpose |
|---------|---------|---------|
| pydantic-settings | >=2.6.0 | Settings management |
| structlog | >=24.4.0 | Structured logging |
| tenacity | >=9.0.0 | Retry with backoff |
| asyncpg | >=0.30.0 | Async PostgreSQL |
| argon2-cffi | >=23.1.0 | Modern password hashing |
| faiss-cpu | >=1.9.0 | Vector search (upgraded) |

## [2.1.0] - 2024-12-14

### Added

#### Developer Experience
- **ESLint Configuration** - Added comprehensive ESLint setup with React and hooks plugins
- **Prettier Configuration** - Added Prettier for consistent code formatting
- **New npm scripts** - `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `clean`
- **Custom React Hooks** (`src/lib/hooks.js`) - Reusable hooks for localStorage, media queries, debounce, click outside, async operations, viewport detection, and responsive breakpoints
- **Utility Functions** (`src/lib/utils.js`) - Common utilities including `cn()` for class merging, date formatting, clipboard, storage, debounce/throttle, feature detection
- **UI Component Library** (`src/components/ui/index.jsx`) - Reusable components: Spinner, LoadingOverlay, Skeleton, Avatar, Badge, Button, Card, EmptyState, Tooltip, Divider

#### Design System
- **Premium CSS Utilities** - Glassmorphism effects (`.glass`, `.glass-light`)
- **Gradient Utilities** - `.gradient-primary`, `.gradient-accent`, `.gradient-success`, `.gradient-text`, `.gradient-border`
- **Animation Effects** - Shimmer loading, glow effects, pulse, float, slide-up, scale-in, bounce animations
- **Modern Shadows** - `.shadow-soft`, `.shadow-elevated`
- **Interactive Effects** - `.hover-lift`, `.hover-scale`
- **Skeleton Loading** - `.skeleton` with shimmer animation
- **Scrollbar Styling** - `.scrollbar-hide`, `.scrollbar-thin`

#### Tailwind Enhancements
- Extended color palette with `success`, `warning`, `info` variants
- Custom font families (Sora, JetBrains Mono)
- Additional keyframe animations: fade-in/out, slide-in, zoom-in/out, ping-slow, spin-slow, pulse-subtle, bounce-subtle, wiggle, gradient-shift
- Custom transition timing functions: `bounce-in`, `smooth`
- Extended spacing utilities: `18`, `88`, `128`
- Extended border radius: `xl`, `2xl`

#### SEO & PWA
- Comprehensive meta tags with OpenGraph and Twitter Cards
- Improved PWA manifest support
- Apple mobile web app configurations
- Font preconnect for performance

### Improved

#### CI/CD Pipeline
- Enhanced GitHub Actions workflow with parallel jobs
- Added Python backend validation (flake8, mypy)
- Added security audit stage (npm audit, secret detection)
- Implemented build caching for faster CI runs
- Added concurrency controls to cancel in-progress runs

#### Error Handling
- Enhanced ErrorBoundary with animated UI
- Added error event ID for support reference
- "Try Again" functionality without full page reload
- Collapsible technical details with component stack
- Direct link to report issues on GitHub

#### Documentation
- Added `CONTRIBUTING.md` with comprehensive contribution guidelines
- Added `SECURITY.md` with vulnerability reporting process
- Added `CHANGELOG.md` (this file)

#### Code Quality
- Removed backup files (`.bak` files)
- Improved package.json with better metadata
- Version bumped to 2.1.0
- Added proper repository and bugs URLs

### Changed
- Updated `index.html` with improved SEO structure
- Enhanced viewport meta tag for better accessibility (`user-scalable=yes`)
- Updated project description in package.json
- Improved Node.js engine requirement (`>=20.0.0`)

## [2.0.0] - Previous Release

### Features
- Multi-provider AI integration (OpenAI, Anthropic, xAI, Google, Meta)
- Real-time voice interaction with NVIDIA Nemotron Nano 9B V2
- Universal language support (22+ Indian languages + 17+ global languages)
- Advanced RAG system with FAISS vector search
- React 19 + FastAPI architecture
- Enterprise-grade security features
- Mission Control Dashboard

---

## Migration Guide

### From 2.0.0 to 2.1.0

1. **Install new dependencies:**
   ```bash
   npm install
   ```

2. **Use new utility functions:**
   ```javascript
   import { cn } from './lib/utils';
   import { useLocalStorage, useMediaQuery } from './lib/hooks';
   import { Button, Card, Spinner } from './components/ui';
   ```

3. **Apply new CSS classes:**
   ```html
   <div className="glass shadow-soft hover-lift">
     Glassmorphism card with hover effect
   </div>
   ```

4. **Run linting:**
   ```bash
   npm run lint
   npm run format
   ```

---

[2.1.0]: https://github.com/mangeshraut712/AssistMe-VirtualAssistant/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/mangeshraut712/AssistMe-VirtualAssistant/releases/tag/v2.0.0
