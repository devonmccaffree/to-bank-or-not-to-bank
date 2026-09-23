import { WebSocketServer } from "ws";

/** Dev-server socket for live tables. Nitro serves the same path in production. */
export function tableWsPlugin() {
  return {
    name: "app-builder:table-ws",
    apply: "serve",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      server.httpServer?.on("upgrade", (req, socket, head) => {
        const path = (req.url ?? "").split("?", 1)[0];
        if (path !== "/api/table-ws") return;
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      });
      wss.on("connection", (ws, req) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const code = url.searchParams.get("code") ?? "";
        const token = url.searchParams.get("token") ?? "";
        let stop = () => {};
        server
          .ssrLoadModule("/src/lib/game/room-live.server.ts")
          .then((mod) => {
            if (ws.readyState !== ws.OPEN) return;
            stop = mod.watchRoom(code, token, (json) => {
              if (ws.readyState === ws.OPEN) ws.send(json);
            });
          })
          .catch((err) => {
            console.error("[table-ws]", err);
            ws.close();
          });
        const done = () => stop();
        ws.on("close", done);
        ws.on("error", done);
      });
    },
  };
}
