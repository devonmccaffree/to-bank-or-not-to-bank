import { r as __exportAll } from "../../_runtime.mjs";
import { i as defineWebSocketHandler } from "../../_libs/h3+rou3.mjs";
//#region src/lib/game/room-live.server.ts
var tables = /* @__PURE__ */ new Map();
function tableFor(code) {
	let table = tables.get(code);
	if (!table) {
		table = {
			watchers: /* @__PURE__ */ new Set(),
			timer: null,
			running: false
		};
		tables.set(code, table);
	}
	return table;
}
function schedule(code, delay) {
	const table = tables.get(code);
	if (!table) return;
	if (table.timer) clearTimeout(table.timer);
	table.timer = setTimeout(() => void flush(code), delay);
}
async function flush(code) {
	const table = tables.get(code);
	if (!table) return;
	if (table.running) {
		schedule(code, 40);
		return;
	}
	table.running = true;
	table.timer = null;
	try {
		const tokens = [...new Set([...table.watchers].map((w) => w.token))];
		if (tokens.length > 0) {
			const { readRoomForTokens } = await import("../../_chunks/room.functions.mjs");
			const results = await readRoomForTokens(code, tokens);
			for (const watcher of table.watchers) {
				const result = results[watcher.token];
				if (!result) continue;
				if (!result.ok) {
					if (!watcher.sawError) {
						watcher.sawError = true;
						watcher.send(JSON.stringify(result));
					}
					continue;
				}
				watcher.sawError = false;
				if (watcher.lastVersion === result.snapshot.version) continue;
				watcher.lastVersion = result.snapshot.version;
				watcher.send(JSON.stringify(result));
			}
		}
	} catch {} finally {
		const current = tables.get(code);
		if (current) {
			current.running = false;
			if (current.watchers.size > 0) schedule(code, 500);
		}
	}
}
/** Wake every socket on this server that is watching the table. */
function pokeRoom(code) {
	if (!tables.has(code)) return;
	schedule(code, 0);
}
function watchRoom(code, token, send) {
	const table = tableFor(code);
	const watcher = {
		token,
		send,
		lastVersion: -1,
		sawError: false
	};
	table.watchers.add(watcher);
	schedule(code, 0);
	return () => {
		table.watchers.delete(watcher);
		if (table.watchers.size === 0) {
			if (table.timer) clearTimeout(table.timer);
			tables.delete(code);
		}
	};
}
//#endregion
//#region server/routes/api/table-ws.ts
var table_ws_exports = /* @__PURE__ */ __exportAll({ default: () => table_ws_default });
var stops = /* @__PURE__ */ new WeakMap();
var table_ws_default = defineWebSocketHandler({
	open(peer) {
		const url = new URL(peer.request?.url ?? "http://localhost/api/table-ws");
		const stop = watchRoom(url.searchParams.get("code") ?? "", url.searchParams.get("token") ?? "", (json) => {
			peer.send(json);
		});
		stops.set(peer, stop);
	},
	close(peer) {
		stops.get(peer)?.();
		stops.delete(peer);
	}
});
//#endregion
export { table_ws_default as default, pokeRoom as n, table_ws_exports as t };
