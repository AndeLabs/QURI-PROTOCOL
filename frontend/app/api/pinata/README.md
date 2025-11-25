# Pinata IPFS API Routes - Secure Server-Side Implementation

## Overview

This directory contains secure server-side API routes for uploading files and JSON metadata to IPFS via Pinata. The JWT token is kept server-side and never exposed to the browser.

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│   Browser   │──────▶│  API Routes  │──────▶│    Pinata    │
│  (Client)   │       │  (Server)    │       │    (IPFS)    │
└─────────────┘       └──────────────┘       └──────────────┘
                             │
                             │ Uses PINATA_JWT
                             │ (server-side only)
                             ▼
                      process.env.PINATA_JWT
```

## Security Features

### 1. Server-Side JWT Storage
- JWT token stored in `PINATA_JWT` environment variable (NOT `NEXT_PUBLIC_*`)
- Never exposed to browser/client
- Only accessible to server-side code

### 2. Rate Limiting
- In-memory rate limiting (10 req/min for files, 20 req/min for JSON)
- IP-based tracking
- Returns 429 status code when limit exceeded
- For production: replace with Redis-based rate limiting

### 3. Authentication
- Currently allows all uploads (can be restricted)
- Placeholder for ICP authentication integration
- Easy to add principal verification

### 4. Input Validation
- File size limits (10MB max)
- File type validation (images only)
- JSON structure validation
- Size validation for JSON (1MB max)

### 5. Error Handling
- Proper HTTP status codes
- User-friendly error messages
- Detailed server-side logging
- Retry logic with exponential backoff

## API Endpoints

### POST /api/pinata/upload
Upload a file to IPFS.

**Request:**
```typescript
Content-Type: multipart/form-data

FormData {
  file: File
}
```

**Response:**
```typescript
{
  ipfsHash: string;      // e.g., "Qm..."
  ipfsUrl: string;       // e.g., "ipfs://Qm..."
  gatewayUrl: string;    // e.g., "https://gateway.pinata.cloud/ipfs/Qm..."
  size: number;          // File size in bytes
}
```

**Rate Limit:** 10 requests per minute per IP

**Example:**
```typescript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/api/pinata/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.ipfsHash); // "Qm..."
```

### POST /api/pinata/pin
Upload JSON metadata to IPFS.

**Request:**
```typescript
Content-Type: application/json

{
  metadata: RuneMetadata;
  name?: string;
}
```

**Response:**
```typescript
{
  ipfsHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
  size: number;
}
```

**Rate Limit:** 20 requests per minute per IP

**Example:**
```typescript
const response = await fetch('/api/pinata/pin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    metadata: {
      name: 'MyRune',
      symbol: 'RUNE',
      image: 'ipfs://Qm...',
      // ... other fields
    },
  }),
});

const result = await response.json();
console.log(result.ipfsHash);
```

## Client-Side Usage

### Recommended: Use the usePinata Hook

```typescript
import { usePinata } from '@/hooks/usePinata';

function MyComponent() {
  const { uploadFile, uploadMetadata, uploadRuneAssets, isUploading, error } = usePinata();

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, (progress) => {
        console.log(`Upload: ${progress.percentage}%`);
      });
      console.log('Uploaded:', result.ipfsHash);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {isUploading && <p>Uploading...</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Legacy: Direct API Calls

```typescript
// Upload file
const formData = new FormData();
formData.append('file', file);

const uploadResponse = await fetch('/api/pinata/upload', {
  method: 'POST',
  body: formData,
});

const uploadResult = await uploadResponse.json();

// Upload metadata
const metadataResponse = await fetch('/api/pinata/pin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ metadata }),
});

const metadataResult = await metadataResponse.json();
```

## Environment Variables

### Development (.env.local)
```bash
PINATA_JWT=your-pinata-jwt-token
```

### Production (.env.production)
```bash
PINATA_JWT=your-production-pinata-jwt-token
```

### Vercel Deployment
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `PINATA_JWT` (NOT `NEXT_PUBLIC_PINATA_JWT`)
3. Set for all environments (Production, Preview, Development)
4. Redeploy

## Migration Guide

### Old Code (Client-side JWT - INSECURE)
```typescript
import { uploadToPinata } from '@/lib/storage/pinata-storage';

// JWT was exposed to browser via NEXT_PUBLIC_PINATA_JWT
const result = await uploadToPinata(file);
```

### New Code (Server-side JWT - SECURE)
```typescript
import { usePinata } from '@/hooks/usePinata';

const { uploadFile } = usePinata();
const result = await uploadFile(file);
```

## Rate Limiting

### Current Implementation
- In-memory Map store
- Simple IP-based tracking
- 1-minute sliding window
- Automatic cleanup of old entries

### Production Recommendations
Replace with Redis-based rate limiting:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

const { success } = await ratelimit.limit(clientId);
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

## Authentication Enhancement

To add proper ICP authentication:

```typescript
import { verifyIcpPrincipal } from '@/lib/icp/auth';

function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return { authenticated: false, error: 'No authentication provided' };
  }

  try {
    const principal = verifyIcpPrincipal(authHeader);
    return { authenticated: true, principal };
  } catch (error) {
    return { authenticated: false, error: 'Invalid authentication' };
  }
}
```

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad Request (invalid file/JSON) |
| 401 | Unauthorized (no auth) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error (server/Pinata issue) |

## Monitoring

The routes include extensive logging:

```typescript
import { logger } from '@/lib/logger';

logger.info('File uploaded', { ipfsHash, size });
logger.warn('Rate limit exceeded', { clientId });
logger.error('Upload failed', error);
```

## Testing

### Manual Testing
```bash
# Upload file
curl -X POST http://localhost:3000/api/pinata/upload \
  -F "file=@image.png"

# Upload JSON
curl -X POST http://localhost:3000/api/pinata/pin \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"name":"Test","symbol":"TST","image":"ipfs://..."}}'
```

### Rate Limit Testing
```bash
# Send 15 requests rapidly (should see 429 after 10)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/pinata/upload \
    -F "file=@test.png" &
done
```

## Security Checklist

- [x] JWT stored server-side only (not `NEXT_PUBLIC_*`)
- [x] Rate limiting implemented
- [x] File size validation
- [x] File type validation
- [x] JSON size validation
- [x] Error messages don't leak sensitive info
- [x] Logging for monitoring
- [ ] ICP authentication (TODO)
- [ ] Redis-based rate limiting for production (TODO)
- [ ] CORS configuration if needed (TODO)

## Troubleshooting

### "Configuración de IPFS inválida"
- Check that `PINATA_JWT` is set in environment variables
- Verify the JWT is valid (not a placeholder)
- Ensure it's `PINATA_JWT`, not `NEXT_PUBLIC_PINATA_JWT`

### "Rate limit alcanzado"
- Wait 1 minute before retrying
- Check rate limit headers in response
- For production, implement Redis-based rate limiting

### "Archivo muy grande"
- File must be < 10MB
- Compress images before uploading
- Consider splitting large files

## Future Enhancements

1. **Batch Uploads**: Upload multiple files in one request
2. **Progress Streaming**: Server-sent events for upload progress
3. **Automatic Image Optimization**: Resize/compress on server
4. **IPFS Cluster**: Replicate across multiple IPFS nodes
5. **Content Addressing**: Verify file integrity via CID
6. **Caching**: Cache IPFS hashes to prevent duplicate uploads
7. **Webhook Integration**: Notify when upload completes
8. **Analytics**: Track upload metrics (size, type, frequency)

## Resources

- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Rate Limiting Best Practices](https://www.ietf.org/rfc/rfc6585.txt)
