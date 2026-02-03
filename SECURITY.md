# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the Mafia game, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: [your-email@example.com]
3. Include detailed steps to reproduce the vulnerability
4. Allow up to 48 hours for initial response

## Security Measures

### Current Implementation

- ✅ Input validation with Zod schemas
- ✅ Rate limiting on API endpoints
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ JWT authentication
- ✅ MongoDB parameterized queries
- ✅ Password hashing with bcrypt
- ✅ Environment-based security (dev vs prod)

### Production Requirements

- Strong JWT secrets (32+ characters)
- HTTPS/TLS encryption
- Secure password policies
- Regular dependency updates
- Docker security best practices

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Updates

Security patches will be released as soon as possible after validation.
