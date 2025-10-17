# 🔐 Security Guide - AssistMe Virtual Assistant

## 🚫 **NEVER COMMIT API KEYS**

This document explains how to securely handle API keys and sensitive credentials in this project.

## 📁 **File Structure & Security**

```
AssistMe-VirtualAssistant/
├── .env                     # Template (SAFE to commit)
├── .env.example             # Developer setup guide (SAFE)
├── secrets.env              # ⭐ YOUR API KEYS (NEVER COMMIT)
├── .gitignore              # Prevents committing secrets
└── docker-compose.yml       # Loads secrets.env safely
```

## 🛡️ **Security Setup**

### **Step 1: Get Your OpenRouter API Key**
1. Visit [OpenRouter.ai](https://openrouter.ai/keys)
2. Generate a new API key
3. Copy the key (starts with `sk-or-v1-`)

### **Step 2: Create Secrets File**
```bash
# Copy the template
cp .env.example secrets.env

# Edit with real values
nano secrets.env

# Replace the dummy key with your real key
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
```

### **Step 3: Verify Security**
```bash
# These files should NEVER be committed
git status

# If secrets.env appears, check .gitignore immediately
# The .gitignore should contain:
# secrets.env
# .env*
```

## 🔍 **What Each File Does**

| File | Purpose | Git Safe? | Content |
|------|---------|-----------|---------|
| `.env.example` | Template showing required variables | ✅ Safe | Dummy values |
| `.env` | Developer template | ✅ Safe | Dummy/placeholder values |
| `secrets.env` | **Actual API keys** | ❌ DANGER | **REAL CREDENTIALS** |

## ⚠️ **Security Issues to Avoid**

### **❗ Common Mistakes (Don't Do These):**

1. **Committing secrets.env:**
   ```bash
   # WRONG - Will leak your API key
   git add secrets.env
   git commit -m "Add secrets file"
   ```

2. **Renaming without updating .gitignore:**
   ```bash
   # WRONG - Will still leak keys
   mv secrets.env super-secret.env
   # Forgets to update .gitignore
   ```

3. **Using .env with real keys:**
   ```bash
   # DANGER - .env files can still be accidentally committed
   echo "OPENROUTER_API_KEY=sk-my-real-key" > .env
   ```

4. **Environment variables in code:**
   ```bash
   # WRONG - Hardcoded secrets
   export OPENROUTER_API_KEY="my-secret-key"
   ```

### **✅ Correct Approach:**

```bash
# 1. Use secrets.env for real values
echo "OPENROUTER_API_KEY=sk-your-real-key" > secrets.env

# 2. Use .env.example for templates
cp .env.example .env.example

# 3. Docker-compose loads secrets from env_file
env_file:
  - secrets.env

# 4. Never commit secrets.env (handled by .gitignore)
```

## 🐛 **Troubleshooting Security Issues**

### **What to do if you committed a key:**

1. **Immediately revoke the key**
   - OpenRouter: Delete and create new key

2. **Remove from git history:**
   ```bash
   # Remove from git history completely
   git filter-branch --tree-filter 'rm -f secrets.env' --prune-empty HEAD
   git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
   git reflog expire --expire=now --all
   git gc --prune=now
   ```

3. **Update all configured secrets**

## 🔧 **Alternative Secure Methods**

### **Option 1: Environment Variables (Less Secure)**
```bash
# Set in your shell only (not in files)
export OPENROUTER_API_KEY="your-key-here"

# Docker-compose without env_file
environment:
  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
```

### **Option 2: Docker Secrets (Most Secure)**
```yaml
# In docker-compose.yml
services:
  api:
    secrets:
      - openrouter_key

secrets:
  openrouter_key:
    file: ./secrets.env
    environment: "OPENROUTER_API_KEY"
```

### **Option 3: Key Management Service (Production)**
- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault
- Vault by HashiCorp

## 🧪 **Testing Security**

```bash
# Test that secrets are loaded
docker-compose exec api env | grep OPENROUTER

# Test that keys work (without exposing them)
docker-compose exec api python -c "import os; print('Key loaded:', bool(os.getenv('OPENROUTER_API_KEY')))"

# Test actual API call (with key)
curl -X POST http://localhost:8001/api/chat/text \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Test"}], "model": "qwen/qwen3-8b-instruct"}'
```

## 📋 **Security Checklist**

- [ ] `.gitignore` contains `secrets.env`
- [ ] `.gitignore` contains `.env*`
- [ ] `secrets.env` is never committed
- [ ] API keys are from OpenRouter (valid source)
- [ ] Keys are rotated regularly
- [ ] No credentials in code or commits
- [ ] Development uses separate API keys

## 🚨 **Emergency Response**

If you suspect a key has been compromised:

1. **Stop all services:** `docker-compose down`
2. **Revoke API key** on OpenRouter dashboard
3. **Generate new key**
4. **Update secrets.env**
5. **Restart services:** `docker-compose up -d`
6. **Monitor for unauthorized usage**
7. **Consider changing passwords if account is compromised**

## 💡 **Best Practices**

1. **Never commit secrets** - Always use `secrets.env`
2. **Use environment-specific keys** - Different keys for dev/staging/prod
3. **Rotate keys regularly** - Monthly rotation recommended
4. **Monitor usage** - Check OpenRouter dashboard for suspicious activity
5. **Limit key permissions** - Use read-only keys when possible
6. **Document but don't share** - Keep this security guide handy

---

**Remember: The security of your API keys directly impacts your costs and data privacy. Treat them like passwords!** 🔒
