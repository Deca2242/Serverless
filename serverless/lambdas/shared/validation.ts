import type { ZodSchema } from "zod";
import { ValidationError } from "./errors";

export function parseBody<T>(schema: ZodSchema<T>, body?: string): T {
  const parsed = schema.safeParse(JSON.parse(body ?? "{}"));
  if (!parsed.success) throw new ValidationError(parsed.error.message);
  return parsed.data;
}

export function parseQuery<T>(
  schema: ZodSchema<T>,
  params: Record<string, string | undefined>,
): T {
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw new ValidationError(parsed.error.message);
  return parsed.data;
}
