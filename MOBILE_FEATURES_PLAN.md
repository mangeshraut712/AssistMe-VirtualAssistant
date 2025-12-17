# Mobile Feature Panel Improvements - Action Plan

## Issues to Fix

### 1. **ImageGenerationPanel** (Imagine)
- ✅ Already has responsive columns: `columns-2 md:columns-3 lg:columns-4`
- ✅ Floating input bar at bottom
- ⚠️ **Fix Needed**: Settings popover might overflow on mobile
- ⚠️ **Fix Needed**: Style preset scrolling needs better mobile UX

### 2. **GrokipediaPanel**
- ✅ TOC hidden on mobile: `hidden lg:block`
- ⚠️ **Fix Needed**: Search input needs mobile optimization
- ⚠️ **Fix Needed**: Model selector dropdown on mobile
- ⚠️ **Fix Needed**: Article content padding on mobile

### 3. **AdvancedVoiceMode**
- ✅ Already has responsive sizing: `sm:` breakpoints
- ✅ Orb size responsive: `w-36 h-36 sm:w-44 sm:h-44`
- ✅ Text responsive: `text-xl sm:text-2xl`
- ✓ **Good mobile support**

### 4. **AI4BharatPanel**
- ✅ Grid responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- ⚠️ **Fix Needed**: Hero text might be too large on mobile
- ⚠️ **Fix Needed**: Input areas need mobile padding

### 5. **UnifiedToolsPanel** (Writing Studio)
- ⚠️ **Fix Needed**: Sidebar hidden on mobile: `hidden md:flex`
- ⚠️ **Fix Needed**: Need mobile navigation for tools
- ⚠️ **Fix Needed**: Text areas need better mobile sizing

### 6. **SpeedtestPanel** (Network Suite)
- ✅ Good grid system: `grid-cols-1 lg:grid-cols-2`
- ✅ Responsive cards
- ✓ **Good mobile support**

## Priority Fixes (High to Low)

1. **UnifiedToolsPanel** - Add mobile tool selector
2. **GrokipediaPanel** - Improve search and model selector
3. **ImageGenerationPanel** - Fix settings popover overflow
4. **AI4BharatPanel** - Adjust hero text size

## Implementation Strategy

- Use bottom sheet pattern for mobile settings
- Add hamburger menu for tool selection
- Ensure all touch targets are 44x44px minimum
- Add safe-area padding where needed
- Test with iPhone notch simulation
