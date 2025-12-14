# Contributing to AssistMe Virtual Assistant

Thank you for your interest in contributing to AssistMe! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## 📜 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please be respectful, inclusive, and constructive in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **Python** 3.11 or higher
- **npm** 9.x or higher
- **Git** for version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AssistMe-VirtualAssistant.git
   cd AssistMe-VirtualAssistant
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/mangeshraut712/AssistMe-VirtualAssistant.git
   ```

## 🛠️ Development Setup

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
DEV_MODE=true python -m uvicorn app.main:app --reload --port 8001
```

### Quick Start (Both Servers)

```bash
./quick-start.sh
# Choose option 4 to start both servers
```

## ✏️ Making Changes

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/voice-commands`)
- `fix/` - Bug fixes (e.g., `fix/chat-scroll-issue`)
- `docs/` - Documentation changes (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/chat-component`)
- `test/` - Adding tests (e.g., `test/api-endpoints`)

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(chat): add message reactions feature
fix(voice): resolve audio playback delay
docs(readme): update installation instructions
```

## 🔄 Pull Request Process

1. **Update your branch** with the latest changes from main
2. **Test your changes** thoroughly
3. **Update documentation** if necessary
4. **Create a Pull Request** with:
   - Clear title following commit message format
   - Detailed description of changes
   - Screenshots/videos for UI changes
   - Reference to related issues

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Responsive design verified
- [ ] Accessibility checked

## 📏 Coding Standards

### JavaScript/React

```javascript
// Use functional components with hooks
const MyComponent = ({ prop1, prop2 }) => {
    const [state, setState] = useState(null);
    
    useEffect(() => {
        // Effect logic
    }, [dependencies]);
    
    return (
        <div className="my-component">
            {/* JSX content */}
        </div>
    );
};

// Use destructuring for props
// Use meaningful variable names
// Keep components focused and small
```

### Python/FastAPI

```python
# Use type hints
async def get_item(item_id: int) -> ItemResponse:
    """Get an item by ID.
    
    Args:
        item_id: The unique identifier of the item.
        
    Returns:
        ItemResponse: The item data.
        
    Raises:
        HTTPException: If item not found.
    """
    pass

# Use docstrings for all functions
# Follow PEP 8 style guide
# Use async/await for I/O operations
```

### CSS/Tailwind

```css
/* Use CSS variables for theming */
/* Keep specificity low */
/* Mobile-first responsive design */
/* Use semantic class names */
```

## 🧪 Testing

### Frontend Tests

```bash
# Run frontend build check
npm run build

# Check for TypeScript/ESLint errors (if configured)
npm run lint
```

### Backend Tests

```bash
cd backend

# Syntax check
python -m compileall app

# Run tests (if available)
pytest
```

### Manual Testing Checklist

- [ ] Chat functionality works
- [ ] Voice input/output works
- [ ] Theme switching works
- [ ] Mobile responsiveness
- [ ] Error handling displays correctly
- [ ] API endpoints respond correctly

## 🐛 Reporting Issues

When reporting issues, please include:

1. **Clear title** describing the problem
2. **Environment details** (OS, browser, Node version)
3. **Steps to reproduce**
4. **Expected behavior**
5. **Actual behavior**
6. **Screenshots/recordings** if applicable
7. **Console errors** if any

## 💡 Feature Requests

For feature requests:

1. Check existing issues for duplicates
2. Describe the feature clearly
3. Explain the use case
4. Provide mockups if applicable

## 📞 Questions?

- Open a GitHub Discussion for general questions
- Create an Issue for bugs or features
- Check existing documentation first

---

**Thank you for contributing to AssistMe! 🎉**
