/**
 * Vite plugin for the iOS app build (vite.config.cap.ts, CAP_BUILD=1).
 *
 * Adjusts Grok's root route at build time instead of editing
 * src/routes/__root.tsx (which is replaced on every Grok merge):
 *   - drops the Google Fonts preconnect/stylesheet links and the
 *     /__grok/* PWA links (manifest, apple-touch-icon), which don't exist in
 *     the bundle;
 *   - adds a stylesheet link for the bundled fonts (scripts/cap/fonts.css);
 *   - imports src/lib/native-hooks.ts (bust haptics via store subscriptions).
 *
 * The Grok PWA head/extensions.js injection lives in scripts/grok-pwa-plugin.mjs
 * and server/middleware/grok-pwa.ts; the app config simply doesn't load
 * either, so nothing to strip here.
 *
 * Fails the build loudly if the root route no longer looks the way this
 * expects, rather than shipping a half-configured app.
 */
const ROOT_ROUTE = /\/src\/routes\/__root\.tsx$/;

const APPENDIX = `
import __capFontsHref from "/scripts/cap/fonts.css?url";
import "/src/lib/native-hooks.ts";
{
  const __capDrop = /^https:\\/\\/fonts\\.(googleapis|gstatic)\\.com|^\\/__grok\\//;
  const __capFix = (head) => {
    const h = head ?? {};
    const links = (h.links ?? []).filter((l) => !__capDrop.test(String((l && l.href) ?? "")));
    return { ...h, links: [{ rel: "stylesheet", href: __capFontsHref }, ...links] };
  };
  const __capHead = Route.options.head;
  Route.options.head = (ctx) => {
    const head = __capHead ? __capHead(ctx) : undefined;
    return head && typeof head.then === "function" ? head.then(__capFix) : __capFix(head);
  };
}
`;

export function capAppModePlugin() {
  return {
    name: "bank:cap-app-mode",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?", 1)[0];
      if (!ROOT_ROUTE.test(file) || id.includes("?")) return null;
      if (!/export const Route\s*=\s*createRootRoute\(/.test(code)) {
        this.error(
          "[cap] src/routes/__root.tsx no longer exports `Route = createRootRoute(...)`; update scripts/cap/app-mode-plugin.mjs",
        );
      }
      return { code: code + APPENDIX, map: null };
    },
  };
}
