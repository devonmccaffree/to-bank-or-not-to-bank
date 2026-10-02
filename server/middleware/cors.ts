/**
 * CORS for the bundled iOS app only. The website is same-origin and never
 * gets these headers. No cookies.
 */
const CAPACITOR_ORIGIN = "capacitor://localhost";

interface CorsEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

function isAppPath(pathname: string): boolean {
  return pathname.startsWith("/_serverFn/") || pathname.startsWith("/api/table-ws");
}

function applyCors(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", CAPACITOR_ORIGIN);
  const vary = headers.get("Vary");
  if (!vary) headers.set("Vary", "Origin");
  else if (!vary.split(",").some((part) => part.trim().toLowerCase() === "origin")) {
    headers.set("Vary", `${vary}, Origin`);
  }
}

export default async function capacitorCors(
  event: CorsEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  if (event.req.headers.get("origin") !== CAPACITOR_ORIGIN || !isAppPath(event.url.pathname)) {
    return next();
  }

  if ((event.req.method ?? "GET").toUpperCase() === "OPTIONS") {
    const headers = new Headers();
    applyCors(headers);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type, x-tsr-serverfn, accept");
    headers.set("Access-Control-Max-Age", "86400");
    return new Response(null, { status: 204, headers });
  }

  const response = await next();
  if (!(response instanceof Response) || response.status === 101) return response;
  const headers = new Headers(response.headers);
  applyCors(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
