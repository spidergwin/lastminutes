// Error handling and logging utilities

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "API_ERROR"
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function logError(error: Error, context?: Record<string, unknown>) {
  console.error({
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

export function createErrorResponse(statusCode: number, message: string, code?: string) {
  return {
    statusCode,
    message,
    code: code || `ERROR_${statusCode}`,
    timestamp: new Date().toISOString(),
  };
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const message = getErrorMessage(error);
    logError(error instanceof Error ? error : new Error(message), { context });
    return { success: false, error: message };
  }
}
