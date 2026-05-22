export const OK = (body: unknown, statusCode = 200) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const CREATED = (body: unknown) => OK(body, 201);
export const NO_CONTENT = () => ({ statusCode: 204, body: "" });
