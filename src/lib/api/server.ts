import "server-only";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  if (new URL(origin).host !== expectedHost) throw new ApiError(403, "invalid-origin");
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: { code: error.code } }, { status: error.status });
  console.error("API failure", error);
  return Response.json({ error: { code: "internal" } }, { status: 500 });
}

