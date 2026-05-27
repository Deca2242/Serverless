import type { ZodSchema } from "zod";
import { ValidationError } from "./errors";

function formatZodError(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): string {
  const { fieldErrors } = error.flatten();
  const parts = Object.entries(fieldErrors)
    .filter(([, messages]) => messages && messages.length > 0)
    .map(([field, messages]) => `${field}: ${messages!.join(", ")}`);
  return parts.length > 0 ? parts.join("; ") : "Validation failed";
}

export function parseBody<T>(schema: ZodSchema<T>, body?: string): T {
  let json: unknown;
  try {
    json = JSON.parse(body ?? "{}");
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ValidationError(formatZodError(parsed.error));
  return parsed.data;
}

export function parseQuery<T>(
  schema: ZodSchema<T>,
  params: Record<string, string | undefined>,
): T {
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw new ValidationError(formatZodError(parsed.error));
  return parsed.data;
}
