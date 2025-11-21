/**
 * API Client Configuration
 * Centralized Axios instance with interceptors for all external APIs
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Hiro API Client for Bitcoin data (Ordinals, Runes, BRC-20)
export const hiroClient = axios.create({
  baseURL: 'https://api.hiro.so',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor for logging and auth
hiroClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add API key if available
    const apiKey = process.env.NEXT_PUBLIC_HIRO_API_KEY;
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Hiro API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and retries
hiroClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    // Rate limit handling (429)
    if (error.response?.status === 429 && config) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;

      console.warn(`[Hiro API] Rate limited. Retrying after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      return hiroClient(config);
    }

    // Server errors (5xx) - retry once
    if (error.response?.status && error.response.status >= 500 && config) {
      const retryCount = (config as any).__retryCount || 0;

      if (retryCount < 1) {
        (config as any).__retryCount = retryCount + 1;
        await new Promise(resolve => setTimeout(resolve, 2000));
        return hiroClient(config);
      }
    }

    // Log errors
    console.error('[Hiro API] Error:', {
      url: config?.url,
      status: error.response?.status,
      message: error.message,
    });

    throw error;
  }
);

// Generic API error type
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Helper to extract error message
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
