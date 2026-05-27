import { CACHE_DEBUG } from "../cache";

export const OK = (
  body: unknown,
  statusCode = 200,
  headers?: Record<string, string>,
) => ({
  statusCode,
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

export const CREATED = (body: unknown, headers?: Record<string, string>) =>
  OK(body, 201, headers);

export const NO_CONTENT = () => ({ statusCode: 204, body: "" });

export const cacheHeader = (status: "HIT" | "MISS"): Record<string, string> => ({
  "X-Cache": status,
});

export function okCached<T>(value: T, cacheStatus: "HIT" | "MISS") {
  return OK(value, 200, CACHE_DEBUG ? cacheHeader(cacheStatus) : undefined);
}
