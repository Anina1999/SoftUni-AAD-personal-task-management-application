/**
 * Helpers shared by the JSON API route handlers (`app/api/**`).
 *
 * Every error response has the same shape, `{ error, errors? }`: `error` is a
 * human-readable message and `errors` holds field-level validation messages.
 */
import "server-only";
import type { NextRequest } from "next/server";

/** Body of every non-2xx API response. */
export interface ApiErrorBody {
  error: string;
  errors?: Record<string, string>;
}

/** Builds a JSON error response. */
export function errorResponse(
  status: number,
  error: string,
  errors?: Record<string, string>,
): Response {
  const body: ApiErrorBody = errors ? { error, errors } : { error };
  return Response.json(body, { status });
}

/**
 * Reads the request body as a JSON object.
 *
 * Only `Content-Type: application/json` is accepted. Besides being explicit,
 * this blocks cross-site form posts (CSRF): a browser sends that content type
 * to another origin only after a CORS preflight, which this API never allows.
 *
 * @returns The parsed object, or a 400/415 response to send back as-is.
 */
export async function readJsonObject(
  request: Request,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      response: errorResponse(415, "Send the request body as JSON (Content-Type: application/json)."),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: errorResponse(400, "The request body is not valid JSON.") };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, response: errorResponse(400, "The request body must be a JSON object.") };
  }
  return { ok: true, body: body as Record<string, unknown> };
}

/**
 * Wraps a route handler so an unexpected error is logged and answered with a
 * JSON 500 response instead of Next.js's HTML error page.
 */
export function handle<Context>(
  handler: (request: NextRequest, context: Context) => Promise<Response>,
): (request: NextRequest, context: Context) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(`${request.method} ${request.nextUrl.pathname} failed`, error);
      return errorResponse(500, "Something went wrong on the server. Please try again.");
    }
  };
}
