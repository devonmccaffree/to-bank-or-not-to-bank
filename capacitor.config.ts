import type { CapacitorConfig } from "@capacitor/cli";

// Release builds load the live site. For local testing against the dev
// server, run: CAP_DEV=1 npx cap sync ios
const useDevServer = process.env.CAP_DEV === "1";

const config: CapacitorConfig = {
  appId: "app.devonmccaffree.bankgame",
  appName: "BANK! Dice Party Game",
  webDir: "public",
  server: {
    ...(useDevServer
      ? { url: "http://localhost:8080", cleartext: true }
      : { url: "https://bankgame.grok.me" }),
    // Bundled page (public/offline.html) shown when the live site can't load:
    // explains that hosting/joining needs a connection, offers Retry, and
    // includes the full rules.
    errorPath: "offline.html",
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#0e1110",
  },
};

export default config;
