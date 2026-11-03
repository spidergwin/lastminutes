/**
 * Last Minutes MACH ApiClient
 * 
 * A type-safe fetch wrapper for communicating with the Go Gateway.
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export class ApiError extends Error {
  constructor(public problem: ProblemDetails) {
    super(problem.detail);
    this.name = "ApiError";
  }
}

let cachedToken: string | null = null;

/**
 * getAuthToken - Retrieves the JWT from the Better Auth token bridge.
 * Returns a valid JWT string or throws if one cannot be found.
 */
export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  console.log("[api-client] Fetching JWT from /api/auth/token...");
  
  try {
    const res = await fetch("/api/auth/token", { 
      method: "GET",
      credentials: "include" 
    });

    if (!res.ok) {
      console.error("[api-client] Token bridge failed:", res.status, res.statusText);
      throw new Error(`Auth bridge failed: ${res.status}`);
    }

    const data = await res.json();
    
    // Better Auth JWT plugin returns { token: "eyJ..." }
    // but we'll handle multiple potential return shapes for resiliency.
    const token = typeof data === 'string' ? data : (data.token || data.jwt || data.session?.token);

    if (!token || typeof token !== "string" || !token.startsWith("eyJ")) {
      console.error("[api-client] Received invalid token type. Expected JWT (eyJ...), got:", 
        token ? (token.length > 10 ? token.substring(0, 10) + "..." : token) : "null/undefined"
      );
      throw new Error("Invalid JWT format received from auth bridge");
    }

    console.log("[api-client] JWT successfully retrieved and cached.");
    cachedToken = token;
    return token;
  } catch (err) {
    console.error("[api-client] Error during token retrieval:", err);
    throw err;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const url = path.startsWith('http') ? path : `${GATEWAY_URL}${path}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  // Handle Token Expiry (Automatic Retry)
  if (res.status === 401) {
    console.warn("[api-client] Token expired (401), attempting one-time refresh...");
    cachedToken = null;
    const newToken = await getAuthToken();
    headers.set("Authorization", `Bearer ${newToken}`);
    const retry = await fetch(url, { ...init, headers });
    return handleResponse<T>(retry);
  }

  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return {} as T;

  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/problem+json") || contentType?.includes("application/json")) {
      const problem: ProblemDetails = await res.json();
      throw new ApiError(problem);
    }
    throw new ApiError({
      type: "about:blank",
      title: res.statusText,
      status: res.status,
      detail: "An unexpected error occurred.",
    });
  }

  return res.json();
}

export const gateway = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { ...init, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { ...init, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { ...init, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "DELETE" }),
  
  // Direct URL for useChat hooks
  url: (path: string) => `${GATEWAY_URL}${path}`,
};
