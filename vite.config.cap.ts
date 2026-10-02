/**
 * iOS app build: the web UI bundled into the Capacitor app (webDir dist-cap/).
 *
 *   npm run build:ios      # = CAP_BUILD=1 vite build -c vite.config.cap.ts && cap sync ios
 *
 * Separate from Grok's vite.config.ts on purpose: that file is replaced on every
 * Grok merge (scripts/merge-grok-latest.sh) and must keep building the
 * server-rendered site for Vercel unchanged. Differences from it:
 *   - TanStack Start SPA mode: the shell is prerendered to dist-cap/index.html
 *     and the app runs fully client-side; no Nitro/Vercel output.
 *   - No Grok PWA plugin (head chrome, extensions.js, install page) and no
 *     dev-only plugins (PGLite bootstrap, auth popup, app env, table-ws).
 *   - Fonts bundled locally instead of Google Fonts (scripts/cap/).
 *   - Server functions + the table WebSocket go to VITE_API_BASE (the live
 *     site); hosting/joining are the only network features.
 */
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { capAppModePlugin } from "./scripts/cap/app-mode-plugin.mjs";

// Vite exposes VITE_* entries already in process.env to the client bundle.
process.env.CAP_BUILD = "1";
process.env.VITE_CAP_BUILD = "1";
process.env.VITE_API_BASE ||= "https://bankgame.grok.me";
process.env.VITE_AUTH_ENABLED ||= "false";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    capAppModePlugin(),
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true, prerender: { outputPath: "/index" } },
    }),
    viteReact(),
  ],
  environments: {
    client: { build: { outDir: "dist-cap", emptyOutDir: true } },
    // Only used to prerender the SPA shell at build time; never shipped.
    ssr: { build: { outDir: ".cap-build/server", emptyOutDir: true } },
  },
});
