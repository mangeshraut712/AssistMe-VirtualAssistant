# 📁 Scripts Directory

This directory contains utility scripts for the project.

## 📂 Files

| Script | Purpose |
|--------|---------|
| `validate-paths.mjs` | Validates import paths across the codebase |
| `capture-screenshots.mjs` | Captures live GitHub Pages screenshots for `docs/screenshots/` |

## 🚀 Usage

```bash
# Run path validation
node scripts/validate-paths.mjs

# Refresh README screenshots from the live demo (requires Playwright)
npx playwright install chromium
node scripts/capture-screenshots.mjs
```

## 📝 Adding New Scripts

When adding new scripts:
1. Use `.mjs` extension for ES modules
2. Use `.sh` for bash scripts
3. Document the script's purpose here
