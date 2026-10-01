import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.devonmccaffree.tobank",
  appName: "To Bank",
  webDir: "public",
  server: {
    url: "http://localhost:8080",
    cleartext: true,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
