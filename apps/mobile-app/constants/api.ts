import { authClient } from './auth-client';
import Constants from 'expo-constants';

// Use dev machine IP for physical device testing, fallback to localhost for emulator
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const DEV_MACHINE_IP = debuggerHost || '10.0.2.2'; // 10.0.2.2 is special for Android Emulator

export const API_BASE_URL = `http://${DEV_MACHINE_IP}:8080/v1`;
export const WS_BASE_URL = `ws://${DEV_MACHINE_IP}:8081`;

/**
 * apiFetch - Type-safe wrapper for the Go Gateway.
 * Automatically injects the Better Auth JWT into the Authorization header.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});

  // Ensure JSON content-type for non-upload requests
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // MACH Standard: Use Bearer Token for Mobile
  const session = await authClient.getSession();
  if (session?.data?.token) {
    headers.set('Authorization', `Bearer ${session.data.token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export const gateway = {
  get: <T>(path: string, init?: RequestInit) => apiFetch(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: any, init?: RequestInit) => 
    apiFetch(path, { ...init, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any, init?: RequestInit) => 
    apiFetch(path, { ...init, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any, init?: RequestInit) => 
    apiFetch(path, { ...init, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, init?: RequestInit) => apiFetch(path, { ...init, method: "DELETE" }),
  
  // Direct direct URL for useChat hooks
  url: (path: string) => `${API_BASE_URL}${path}`,
};
