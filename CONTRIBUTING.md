# Contributing to AssistMe

Thank you for your interest in contributing to AssistMe! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

## Code of Conduct

Be respectful and inclusive. We welcome contributions from everyone.

## Getting Started

### Prerequisites

- Node.js (LTS version)
- Python 3.10+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AssistMe-VirtualAssistant.git
   cd AssistMe-VirtualAssistant
   ```
3. Install dependencies:
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   pip install -r requirements.txt
   ```
4. Create environment files from examples
5. Start development servers:
   ```bash
   # Frontend (terminal 1)
   npm run dev
   
   # Backend (terminal 2)
   cd backend
   python -m uvicorn app.main:app --reload
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Directory Structure

```
src/                 # Frontend code
├── components/      # React components
│   ├── features/    # Feature panels
│   ├── layout/      # Layout components
│   └── ui/          # UI primitives
├── constants/       # App constants
├── context/         # React contexts
├── hooks/           # Custom hooks
├── services/        # API services
└── lib/            # Utilities

backend/             # Backend code
├── app/
│   ├── routes/     # API routes
│   ├── services/   # Business logic
│   └── providers/  # External integrations
```

### Adding New Code

1. **Components**: Add to appropriate folder in `src/components/`
2. **API Calls**: Add to `src/services/index.js`
3. **Constants**: Add to `src/constants/index.js`
4. **Hooks**: Add to `src/hooks/`
5. **Backend Routes**: Add to `backend/app/routes/`
6. **Backend Services**: Add to `backend/app/services/`

## Code Style

### Frontend (JavaScript/React)

- Use functional components with hooks
- Use ES6+ features
- Follow ESLint configuration
- Use meaningful variable names

```javascript
// ✅ Good
const handleSubmit = async (formData) => {
  await chatService.sendMessage(formData);
};

// ❌ Avoid
const fn = async (d) => {
  await api.post(d);
};
```

### Backend (Python)

- Follow PEP 8 guidelines
- Use type hints
- Follow Flake8 and Pylint rules

```python
# ✅ Good
async def generate_article(query: str) -> dict:
    """Generate a knowledge article."""
    results = await web_search_service.search(query)
    return {"article": results}

# ❌ Avoid
async def gen(q):
    r = await search(q)
    return r
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

### Examples

```
feat(knowledge): add deep research article generation
fix(voice): resolve audio playback delay
docs(readme): update installation instructions
refactor(api): consolidate service exports
```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run linters:
   ```bash
   npm run lint          # Frontend
   flake8 backend/      # Backend
   ```
4. Write clear PR description
5. Link related issues
6. Request review

### PR Checklist

- [ ] Code follows project style
- [ ] Linters pass
- [ ] New code is documented
- [ ] PR description is clear
- [ ] Related issues are linked

## Questions?

Open an issue or reach out to the maintainers.

---

Thank you for contributing! 🎉
