# Content Security Policy (CSP) Configuration

## Overview

QURI Protocol implements a strict Content Security Policy to prevent XSS (Cross-Site Scripting) attacks and other code injection vulnerabilities. Our CSP configuration uses a **nonce-based approach** for script execution, which is significantly more secure than using `unsafe-inline` or `unsafe-eval`.

## Architecture

### Components

1. **CSP Library** (`/frontend/lib/security/csp.ts`)
   - Generates cryptographically secure nonces
   - Builds CSP directives based on environment
   - Validates CSP configuration

2. **Middleware** (`/frontend/middleware.ts`)
   - Generates a unique nonce for each request
   - Applies CSP headers to all responses
   - Provides nonce to components via headers

3. **Root Layout** (`/frontend/app/layout.tsx`)
   - Retrieves nonce from headers
   - Passes nonce to child components
   - Adds CSP meta tag for client-side access

## CSP Directives Explained

### Production Configuration

```
default-src 'self'
```
Only allow resources from the same origin by default.

```
script-src 'self' 'nonce-{random}'
```
Only allow scripts from:
- Same origin
- Scripts with the correct nonce (eliminates XSS risk)

**Note:** `unsafe-eval` is **NOT** used in production.

```
style-src 'self' 'unsafe-inline'
```
Allow styles from same origin and inline styles.
- `unsafe-inline` is required for Tailwind CSS
- Future improvement: Use nonces for critical CSS

```
img-src 'self' data: blob: https:
```
Allow images from:
- Same origin
- Data URIs (inline images)
- Blob URIs (dynamically generated images)
- Any HTTPS source (can be restricted further if needed)

```
connect-src 'self' https://ic0.app https://*.ic0.app ...
```
Allow connections to:
- Same origin
- Internet Computer Protocol domains
- Bitcoin explorers (Mempool Space, Hiro)
- IPFS gateways (Pinata, IPFS.io)
- Price feeds (CryptoCompare)

```
frame-src 'self' https://ic0.app https://identity.ic0.app
```
Allow embedding of:
- Same origin frames
- Internet Identity authentication frames

```
worker-src 'self' blob:
```
Allow Web Workers and Service Workers from:
- Same origin
- Blob URIs (for ICP operations)

```
frame-ancestors 'none'
```
**Prevent this site from being embedded in iframes** (clickjacking protection).

```
base-uri 'self'
```
Restrict `<base>` tag to same origin only.

```
form-action 'self'
```
Only allow form submissions to same origin.

```
upgrade-insecure-requests
```
Automatically upgrade HTTP to HTTPS in production.

### Development Configuration

Development mode includes additional directives:

```
script-src 'self' 'nonce-{random}' 'unsafe-eval'
```
- `unsafe-eval` is **only** allowed in development for Hot Module Replacement (HMR)

```
connect-src ... http://localhost:8000 ws://localhost:8000
```
- Allow localhost connections for local development

## Nonce System

### How It Works

1. **Generation**: Middleware generates a unique nonce for each request
   ```typescript
   const nonce = generateNonce(); // Cryptographically secure random string
   ```

2. **Propagation**: Nonce is stored in response headers
   ```typescript
   response.headers.set('x-nonce', nonce);
   ```

3. **Retrieval**: Components retrieve the nonce
   ```typescript
   const nonce = getNonce(); // From headers
   ```

4. **Application**: Nonce is applied to scripts
   ```html
   <script nonce={nonce}>...</script>
   ```

### Security Benefits

- **Eliminates XSS**: Inline scripts without the correct nonce are blocked
- **Per-Request Randomness**: Each request gets a unique nonce
- **No Guessing**: Nonces are cryptographically random (16 bytes)

## Testing CSP

### Manual Testing

Run the CSP test script:

```bash
cd frontend
npm run test:csp
```

This will:
- Generate test nonces
- Build development and production CSP
- Validate directives
- Check for security issues

### Browser Testing

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for CSP violations (will show if any blocked resources)
4. Check Network tab for blocked requests

### Expected Violations

If you see CSP violations, they should be:
- **Intentional blocks**: Malicious scripts or unexpected inline code
- **Configuration issues**: Missing allowed domains (add them to `csp.ts`)

## Common Issues

### Issue: Scripts Not Loading

**Symptom**: JavaScript fails to execute, console shows CSP violations

**Solution**: Ensure scripts use the nonce:
```typescript
// Server components
const nonce = getNonce();

// In JSX
<script nonce={nonce}>...</script>
```

### Issue: Styles Not Applying

**Symptom**: Page appears unstyled

**Solution**: Verify `unsafe-inline` is in `style-src` (required for Tailwind)

### Issue: API Calls Blocked

**Symptom**: Network requests fail with CSP errors

**Solution**: Add the domain to `connect-src` in `csp.ts`:
```typescript
'connect-src': [
  // ... existing domains
  'https://new-api-domain.com',
],
```

### Issue: Internet Identity Not Working

**Symptom**: Authentication popup blocked

**Solution**: Ensure these are in CSP:
```typescript
'frame-src': [
  'https://ic0.app',
  'https://*.ic0.app',
  'https://identity.ic0.app',
],
```

## Monitoring

### Production Monitoring

To monitor CSP violations in production, you can add a report endpoint:

1. Uncomment reporting in `csp.ts`:
   ```typescript
   export function buildCSPWithReporting(nonce: string, isDev: boolean = false): string {
     const baseCSP = buildCSPDirectives(nonce, isDev);
     const reportUri = process.env.CSP_REPORT_URI;
     if (reportUri) {
       return `${baseCSP}; report-uri ${reportUri}`;
     }
     return baseCSP;
   }
   ```

2. Set up a reporting endpoint (e.g., `/api/csp-report`)

3. Add environment variable:
   ```bash
   CSP_REPORT_URI=https://yourdomain.com/api/csp-report
   ```

### Metrics to Track

- Number of CSP violations
- Types of violations (script-src, style-src, etc.)
- Source of violations (which pages/components)

## Best Practices

### DO

✅ Always use nonces for inline scripts in production
✅ Test CSP changes in development first
✅ Keep allowed domains to a minimum
✅ Review CSP violations regularly
✅ Document any CSP changes

### DON'T

❌ Use `unsafe-eval` in production
❌ Use `unsafe-inline` for scripts
❌ Add `https:` wildcard to `script-src` or `connect-src`
❌ Disable CSP in production
❌ Ignore CSP violations

## Migration Guide

### From Unsafe CSP to Nonce-Based CSP

If you're updating from the old CSP configuration:

1. **Remove unsafe directives**:
   ```diff
   - "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
   + "script-src 'self' 'nonce-{nonce}'"
   ```

2. **Update components**:
   - Add nonce prop to Providers
   - Pass nonce to child components that need it

3. **Test thoroughly**:
   - Run `npm run test:csp`
   - Test all features in development
   - Deploy to staging and test again

4. **Monitor**:
   - Check browser console for violations
   - Review error logs after deployment

## References

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

## Support

For CSP-related issues:

1. Check browser console for specific violations
2. Review this documentation
3. Run the test script: `npm run test:csp`
4. Open an issue with:
   - CSP violation message
   - Browser and version
   - Steps to reproduce
