import { defineWebSocketHandler } from "nitro";
import { watchRoom } from "../../../src/lib/game/room-live.server";

const stops = new WeakMap<object, () => void>();

export default defineWebSocketHandler({
  open(peer) {
    const url = new URL(peer.request?.url ?? "http://localhost/api/table-ws");
    const stop = watchRoom(
      url.searchParams.get("code") ?? "",
      url.searchParams.get("token") ?? "",
      (json) => {
        peer.send(json);
      },
    );
    stops.set(peer, stop);
  },
  close(peer) {
    stops.get(peer)?.();
    stops.delete(peer);
  },
});
