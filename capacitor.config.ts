import type { CapacitorConfig } from "@capacitor/cli";

// Release builds bundle the web UI (npm run build:ios → dist-cap/, served from
// capacitor://localhost). Only hosting/joining a table talks to the live
// server (VITE_API_BASE in vite.config.cap.ts).
//
// For local testing against the dev server instead, run:
//   CAP_DEV=1 npx cap sync ios
const useDevServer = process.env.CAP_DEV === "1";

const config: CapacitorConfig = {
  appId: "app.devonmccaffree.bankgame",
  appName: "BANK! Dice Party Game",
  webDir: "dist-cap",
  ...(useDevServer
    ? {
        server: {
          url: "http://localhost:8080",
          cleartext: true,
          // Bundled page (dist-cap/offline.html) shown if the dev server
          // can't load; only meaningful when loading a remote URL.
          errorPath: "offline.html",
        },
      }
    : {}),
  ios: {
    contentInset: "never",
    backgroundColor: "#0e1110",
  },
};

export default config;
