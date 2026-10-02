import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

const CAPACITOR_ORIGIN = "capacitor://localhost";

/**
 * Same rules as TanStack's default server-fn CSRF, plus one extra origin:
 * the bundled iOS app. Every other cross-site caller stays blocked.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => {
    if (ctx.handlerType !== "serverFn") return false;
    if (ctx.request.headers.get("origin") === CAPACITOR_ORIGIN) return false;
    return true;
  },
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
