export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503);
    this.name = "ServiceUnavailableError";
  }
}

export function buildErrorResponse(error: unknown): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  const headers = { "Content-Type": "application/json" };

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
  console.error("Unexpected error:", error);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ error: "Internal server error" }),
  };
}
