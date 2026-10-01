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
    contentInset: "never",
    backgroundColor: "#0e1110",
  },
};

export default config;
