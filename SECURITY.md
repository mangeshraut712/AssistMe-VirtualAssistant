# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## 🛡️ Security Features

AssistMe implements several security measures:

### Authentication & Authorization
- JWT-based authentication with secure token handling
- Password hashing with bcrypt (passlib)
- Rate limiting to prevent abuse

### API Security
- CORS configuration with allowed origins
- Security headers middleware
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy ORM

### Data Protection
- Environment variables for sensitive configuration
- No API keys stored in codebase
- Secure cookie handling

## 🚨 Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### DO NOT

- **Do not** open a public GitHub issue for security vulnerabilities
- **Do not** disclose the vulnerability publicly until it's resolved

### DO

1. **Email us privately** at [security@example.com] with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Any suggested fixes (optional)

2. **Expect a response** within 48 hours acknowledging receipt

3. **Work with us** to understand and resolve the issue

### What to Include

```
Subject: Security Vulnerability Report - AssistMe

Description:
[Detailed description of the vulnerability]

Affected Component:
[e.g., Authentication, API endpoints, Frontend]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Impact:
[Potential impact if exploited]

Environment:
- Version: [e.g., 2.0.0]
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]

Additional Information:
[Any other relevant details]
```

## ⏱️ Response Timeline

| Stage | Timeline |
|-------|----------|
| Initial Response | 48 hours |
| Issue Confirmation | 1 week |
| Fix Development | 2-4 weeks |
| Security Advisory | Upon fix release |

## 🏆 Recognition

We appreciate security researchers who help keep AssistMe safe. Contributors who responsibly disclose vulnerabilities may be:

- Credited in release notes (if desired)
- Added to our security acknowledgments
- [Other recognition as appropriate]

## 🔐 Best Practices for Users

### Environment Variables

```bash
# Never commit these to version control
OPENROUTER_API_KEY=your_secret_key
DATABASE_URL=your_database_url
SECRET_KEY=your_jwt_secret
```

### Deployment Security

1. **Use HTTPS** in production
2. **Set strong secrets** for JWT and session management
3. **Configure CORS** properly for your domain
4. **Enable rate limiting** in production
5. **Keep dependencies updated**

### Recommended Security Headers

The application automatically adds:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [React Security Best Practices](https://reactjs.org/docs/security.html)

## 📝 Changelog

Security-related changes are documented in [CHANGELOG.md](./CHANGELOG.md) when applicable.

---

**Thank you for helping keep AssistMe secure! 🙏**
