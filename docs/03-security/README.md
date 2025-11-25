# Security Documentation

This directory contains security documentation for QURI Protocol.

## Contents

- [Content Security Policy (CSP)](./CSP.md) - XSS prevention and CSP configuration

## Security Features

### 1. Content Security Policy (CSP)

QURI Protocol implements a strict CSP using **nonce-based script execution** to prevent XSS attacks.

**Key Features:**
- No `unsafe-eval` in production
- Nonce-based inline script execution
- Restricted domains for external resources
- Frame-ancestors protection against clickjacking

**Configuration:** `/frontend/lib/security/csp.ts`

**Testing:** `npm run test:csp`

**Documentation:** [CSP.md](./CSP.md)

### 2. Security Headers

All responses include security headers:

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Restricts browser features

**Configuration:** `/frontend/middleware.ts`

### 3. CORS Protection

CORS headers are applied to API routes with:
- Configurable allowed origins
- Restricted HTTP methods
- 24-hour preflight cache

**Configuration:** `/frontend/middleware.ts`

### 4. Request Tracking

Every request gets a unique `X-Request-ID` for:
- Security incident tracking
- Debugging
- Rate limiting coordination

### 5. Environment Variable Protection

Sensitive environment variables are:
- Never exposed to the client
- Validated before use
- Properly scoped (NEXT_PUBLIC_ prefix for client-side only)

## Security Testing

### Automated Tests

```bash
# Test CSP configuration
npm run test:csp

# Run all tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Manual Security Review

1. **CSP Violations**: Check browser console for CSP errors
2. **Network Requests**: Review allowed domains in DevTools
3. **Authentication**: Test Internet Identity integration
4. **Input Validation**: Test forms with malicious input

### Penetration Testing

Before production deployment:
- [ ] XSS testing on all input fields
- [ ] CSRF protection verification
- [ ] Clickjacking protection test
- [ ] Rate limiting validation
- [ ] Authentication flow security

## Security Checklist

### Before Deployment

- [ ] CSP is enabled with no `unsafe-eval` in production
- [ ] All environment variables are properly scoped
- [ ] TypeScript strict mode is enabled
- [ ] All linting errors are resolved
- [ ] Security headers are applied
- [ ] HTTPS is enforced
- [ ] Dependencies are up to date
- [ ] No secrets in code or git history

### After Deployment

- [ ] Monitor CSP violations
- [ ] Check for unexpected 4xx/5xx errors
- [ ] Review security headers with browser tools
- [ ] Test authentication flows
- [ ] Verify CORS configuration

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security@quri.protocol (or appropriate contact)
3. Include:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if applicable)

## Security Resources

### External Tools

- [Observatory by Mozilla](https://observatory.mozilla.org/) - Security header testing
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - CSP validation
- [Security Headers](https://securityheaders.com/) - Header analysis
- [OWASP ZAP](https://www.zaproxy.org/) - Penetration testing

### Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [CSP Quick Reference](https://content-security-policy.com/)
- [Internet Computer Security Best Practices](https://internetcomputer.org/docs/current/developer-docs/security/)

## Security Updates

This documentation should be reviewed and updated:
- After any security-related changes
- Following security incidents
- During major version upgrades
- Quarterly as part of security audits

## Contact

For security-related questions:
- Technical Lead: [contact information]
- Security Team: security@quri.protocol
- Development Team: dev@quri.protocol
