import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for receiving frontend logs
 * In production, forward these to your monitoring service
 */

interface LogPayload {
  level: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  userAgent: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: LogPayload = await request.json();

    // Validate payload
    if (!payload.level || !payload.message) {
      return NextResponse.json(
        { error: 'Invalid log payload' },
        { status: 400 }
      );
    }

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Frontend Log]', payload);
    }

    // In production, forward to monitoring service
    // Example integrations:

    // 1. Sentry
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage(payload.message, {
    //     level: payload.level.toLowerCase(),
    //     extra: payload.context,
    //   });
    // }

    // 2. DataDog
    // if (process.env.DD_API_KEY) {
    //   await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'DD-API-KEY': process.env.DD_API_KEY,
    //     },
    //     body: JSON.stringify({
    //       ddsource: 'browser',
    //       service: 'quri-frontend',
    //       ...payload,
    //     }),
    //   });
    // }

    // 3. Custom logging service
    // if (process.env.LOGGING_ENDPOINT) {
    //   await fetch(process.env.LOGGING_ENDPOINT, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload),
    //   });
    // }

    // For now, just store in memory (in production, use a proper storage)
    // You could also write to a file or database
    if (process.env.NODE_ENV === 'production') {
      // TODO: Store logs in database or forward to monitoring service
      console.error('[Production Error]', {
        level: payload.level,
        message: payload.message,
        url: payload.url,
        timestamp: payload.timestamp,
        error: payload.error,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process log:', error);
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    );
  }
}

// Prevent logging endpoint from being accessed via GET
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
