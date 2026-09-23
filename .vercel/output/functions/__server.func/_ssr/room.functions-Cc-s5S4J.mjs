import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as createGameFromPlayers, c as rematch, l as skipTurn, n as applyRoll, r as confirmBank, t as advanceRound } from "./engine-C76dUDbP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/room.functions-Cc-s5S4J.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var tables = /* @__PURE__ */ new Map();
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
			const { readRoomForTokens } = await import("./room.functions-BZTJ6kKT.mjs").then((n) => n.p);
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
var ROUNDS = /* @__PURE__ */ new Set([
	10,
	15,
	20
]);
function fail(error) {
	return {
		ok: false,
		error
	};
}
function uid() {
	return crypto.randomUUID();
}
function randomCode() {
	return String(Math.floor(Math.random() * 1e4)).padStart(4, "0");
}
function cleanName(raw) {
	if (typeof raw !== "string") return null;
	const name = raw.replace(/\s+/g, " ").trim();
	if (name.length < 1 || name.length > 18) return null;
	return name;
}
function asCode(raw) {
	if (typeof raw !== "string" || !/^\d{4}$/.test(raw)) return null;
	return raw;
}
function asRounds(raw) {
	const n = typeof raw === "number" ? raw : Number(raw);
	return ROUNDS.has(n) ? n : 20;
}
function parsePayload(raw) {
	const value = typeof raw === "string" ? JSON.parse(raw) : raw;
	if (!value || typeof value !== "object") return {
		game: null,
		undo: []
	};
	return {
		game: value.game ?? null,
		undo: Array.isArray(value.undo) ? value.undo : []
	};
}
async function db() {
	const { getSql } = await import("./db-8P9oAyde.mjs");
	return getSql();
}
async function loadRoom(code) {
	const sql = await db();
	const room = (await sql`
    select code, host_token, status, total_rounds, version, payload
    from rooms
    where code = ${code}
  `)[0];
	if (!room) return null;
	return {
		room,
		players: await sql`
    select id, display_name, player_token, seat
    from room_players
    where room_code = ${code}
    order by seat asc
  `
	};
}
function snapshotFor(room, players, token) {
	const seats = players.map((p) => ({
		id: p.id,
		name: p.display_name,
		seat: p.seat
	}));
	const payload = parsePayload(room.payload);
	const status = room.status;
	const base = {
		code: room.code,
		status,
		version: Number(room.version),
		totalRounds: asRounds(room.total_rounds),
		players: seats,
		game: payload.game,
		canUndo: payload.undo.length > 0
	};
	if (token === room.host_token) return {
		...base,
		you: "host",
		youId: null
	};
	const me = players.find((p) => p.player_token === token);
	if (!me) return null;
	return {
		...base,
		you: "player",
		youId: me.id
	};
}
async function writePayload(code, version, status, payload, totalRounds) {
	const sql = await db();
	const body = JSON.stringify(payload);
	const next = (totalRounds === void 0 ? await sql`
          update rooms
          set payload = ${body}::jsonb,
              status = ${status},
              version = version + 1,
              updated_at = now()
          where code = ${code} and version = ${version}
          returning version
        ` : await sql`
          update rooms
          set payload = ${body}::jsonb,
              status = ${status},
              total_rounds = ${totalRounds},
              version = version + 1,
              updated_at = now()
          where code = ${code} and version = ${version}
          returning version
        `)[0]?.version;
	if (next !== void 0) pokeRoom(code);
	return next === void 0 ? null : Number(next);
}
async function mutateGame(code, hostToken, change) {
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const loaded = await loadRoom(code);
		if (!loaded) return fail("That table is gone.");
		if (loaded.room.host_token !== hostToken) return fail("Only the host can do that.");
		if (loaded.room.status === "closed") return fail("This table is closed.");
		const payload = parsePayload(loaded.room.payload);
		if (!payload.game) return fail("The game has not started.");
		const changed = change(payload.game, payload);
		if (!changed || changed.game === payload.game) {
			const snap = snapshotFor(loaded.room, loaded.players, hostToken);
			return snap ? {
				ok: true,
				snapshot: snap
			} : fail("Only the host can do that.");
		}
		const status = changed.status ?? (changed.game.phase === "gameOver" ? "over" : "playing");
		const nextPayload = {
			game: changed.game,
			undo: [...payload.undo, payload.game].slice(-30)
		};
		if (await writePayload(code, Number(loaded.room.version), status, nextPayload) === null) continue;
		const again = await loadRoom(code);
		if (!again) return fail("That table is gone.");
		const snap = snapshotFor(again.room, again.players, hostToken);
		return snap ? {
			ok: true,
			snapshot: snap
		} : fail("Only the host can do that.");
	}
	return fail("Someone else updated the table. Try again.");
}
var createRoom_createServerFn_handler = createServerRpc({
	id: "38888215eb35fcbd97fdde2fd6fdbed049d545f2144fb9a197df240ed8e15f24",
	name: "createRoom",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => createRoom.__executeServer(opts));
var createRoom = createServerFn({ method: "POST" }).handler(createRoom_createServerFn_handler, async () => {
	const sql = await db();
	for (let attempt = 0; attempt < 12; attempt += 1) {
		const code = randomCode();
		const row = (await sql`
      select status, updated_at > now() - interval '6 hours' as fresh
      from rooms
      where code = ${code}
    `)[0];
		if (row && row.status !== "closed" && row.fresh) continue;
		if (row) await sql`delete from rooms where code = ${code}`;
		const hostToken = uid();
		try {
			await sql`
        insert into rooms (code, host_token, status, total_rounds, version, payload)
        values (${code}, ${hostToken}, 'lobby', 20, 0, ${JSON.stringify({
				game: null,
				undo: []
			})}::jsonb)
      `;
		} catch {
			continue;
		}
		const loaded = await loadRoom(code);
		if (!loaded) return fail("Could not open a table.");
		const snapshot = snapshotFor(loaded.room, loaded.players, hostToken);
		if (!snapshot) return fail("Could not open a table.");
		return {
			ok: true,
			snapshot,
			token: hostToken
		};
	}
	return fail("Every code is in use. Try again in a moment.");
});
var joinRoom_createServerFn_handler = createServerRpc({
	id: "8fc33566620ba78becaa511fe6ae7b2764f6b3a8d1c62cd4430d138769e1d563",
	name: "joinRoom",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => joinRoom.__executeServer(opts));
var joinRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(joinRoom_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	const name = cleanName(data?.name);
	if (!code) return fail("Enter the 4-digit code.");
	if (!name) return fail("Enter a name, up to 18 characters.");
	const loaded = await loadRoom(code);
	if (!loaded || loaded.room.status === "closed") return fail("No open table with that code.");
	if (loaded.room.status !== "lobby") return fail("That table has already started.");
	if (loaded.players.length >= 100) return fail("This table is full.");
	if (loaded.players.some((p) => p.display_name.toLowerCase() === name.toLowerCase())) return fail("That name is already at this table.");
	const id = uid();
	const playerToken = uid();
	const seat = (loaded.players.at(-1)?.seat ?? 0) + 1;
	const sql = await db();
	try {
		await sql`
        insert into room_players (id, room_code, display_name, player_token, seat)
        values (${id}, ${code}, ${name}, ${playerToken}, ${seat})
      `;
		await sql`
        update rooms
        set version = version + 1, updated_at = now()
        where code = ${code}
      `;
	} catch {
		return fail("Could not join. Try again.");
	}
	pokeRoom(code);
	const again = await loadRoom(code);
	if (!again) return fail("No open table with that code.");
	const snapshot = snapshotFor(again.room, again.players, playerToken);
	if (!snapshot) return fail("Could not join.");
	return {
		ok: true,
		snapshot,
		token: playerToken,
		playerId: id
	};
});
async function readRoomForTokens(code, tokens) {
	const clean = asCode(code);
	const out = {};
	if (!clean) {
		for (const token of tokens) out[token] = fail("Missing table.");
		return out;
	}
	const loaded = await loadRoom(clean);
	for (const token of tokens) {
		if (!token) {
			out[token] = fail("Missing table.");
			continue;
		}
		if (!loaded || loaded.room.status === "closed") {
			out[token] = fail("That table is closed.");
			continue;
		}
		const snapshot = snapshotFor(loaded.room, loaded.players, token);
		out[token] = snapshot ? {
			ok: true,
			snapshot
		} : fail("You are not at this table.");
	}
	return out;
}
var fetchRoom_createServerFn_handler = createServerRpc({
	id: "86bb4a71c84a1cf9f58a132ab25321b86384ed110214c0e7f56e8925436b0548",
	name: "fetchRoom",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => fetchRoom.__executeServer(opts));
var fetchRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(fetchRoom_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string" || !data.token) return fail("Missing table.");
	return (await readRoomForTokens(code, [data.token]))[data.token] ?? fail("Missing table.");
});
var closeRoom_createServerFn_handler = createServerRpc({
	id: "0a751a71c3e69ff35f2bee6ee41c10ff6145ead55da347f44e09aaf4ddfe92ca",
	name: "closeRoom",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => closeRoom.__executeServer(opts));
var closeRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(closeRoom_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	if (!(await (await db())`
      update rooms
      set status = 'closed', updated_at = now(), version = version + 1
      where code = ${code} and host_token = ${data.token} and status <> 'closed'
      returning code
    `)[0]) return fail("Only the host can close this table.");
	pokeRoom(code);
	const loaded = await loadRoom(code);
	if (!loaded) return fail("That table is closed.");
	const snapshot = snapshotFor(loaded.room, loaded.players, data.token);
	return snapshot ? {
		ok: true,
		snapshot
	} : fail("That table is closed.");
});
var setRoomRounds_createServerFn_handler = createServerRpc({
	id: "2112faa984dd2f50f163a23aab0c5c2f9f439b361278ab3fdffa7dd40100937c",
	name: "setRoomRounds",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => setRoomRounds.__executeServer(opts));
var setRoomRounds = createServerFn({ method: "POST" }).validator((input) => input).handler(setRoomRounds_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	const rounds = asRounds(data?.rounds);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	if (!(await (await db())`
      update rooms
      set total_rounds = ${rounds}, version = version + 1, updated_at = now()
      where code = ${code} and host_token = ${data.token} and status = 'lobby'
      returning code
    `)[0]) return fail("Rounds can only change before the game starts.");
	pokeRoom(code);
	const loaded = await loadRoom(code);
	if (!loaded) return fail("That table is gone.");
	const snapshot = snapshotFor(loaded.room, loaded.players, data.token);
	return snapshot ? {
		ok: true,
		snapshot
	} : fail("Only the host can do that.");
});
var startRoom_createServerFn_handler = createServerRpc({
	id: "9ae89f63219d212bb3b1cf6ada194bffb03fb7c7a5edc683e7d569511014f27b",
	name: "startRoom",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => startRoom.__executeServer(opts));
var startRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(startRoom_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const loaded = await loadRoom(code);
		if (!loaded) return fail("That table is gone.");
		if (loaded.room.host_token !== data.token) return fail("Only the host can start.");
		if (loaded.room.status !== "lobby") return fail("That table has already started.");
		if (loaded.players.length < 2) return fail("Wait for at least two players.");
		let game;
		try {
			game = createGameFromPlayers(loaded.players.map((p) => ({
				id: p.id,
				name: p.display_name
			})), asRounds(loaded.room.total_rounds));
		} catch (err) {
			return fail(err instanceof Error ? err.message : "Could not start.");
		}
		if (await writePayload(code, Number(loaded.room.version), "playing", {
			game,
			undo: []
		}) === null) continue;
		const again = await loadRoom(code);
		if (!again) return fail("That table is gone.");
		const snapshot = snapshotFor(again.room, again.players, data.token);
		return snapshot ? {
			ok: true,
			snapshot
		} : fail("Only the host can start.");
	}
	return fail("Could not start. Try again.");
});
var hostRoll_createServerFn_handler = createServerRpc({
	id: "517382262ce795dfcaa2a358d99b180937ac888e0da7182ace2aaf8246f562c0",
	name: "hostRoll",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostRoll.__executeServer(opts));
var hostRoll = createServerFn({ method: "POST" }).validator((input) => input).handler(hostRoll_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	const sum = Number(data?.sum);
	if (!code || typeof data?.token !== "string" || sum < 2 || sum > 12) return fail("Bad roll.");
	return mutateGame(code, data.token, (game) => {
		const next = applyRoll(game, sum, Boolean(data.doubles));
		if (next === game) return null;
		return { game: next };
	});
});
var hostSkip_createServerFn_handler = createServerRpc({
	id: "09d9c80f90339be1aefeaa736357e0cdb634a6eee235cb53489157c5b5ed169b",
	name: "hostSkip",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostSkip.__executeServer(opts));
var hostSkip = createServerFn({ method: "POST" }).validator((input) => input).handler(hostSkip_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => {
		const next = skipTurn(game);
		if (next === game) return null;
		return { game: next };
	});
});
var hostUndo_createServerFn_handler = createServerRpc({
	id: "13fb781a5b0cf453381ee42ed02dc3b1002bafcda057b2ecd6e5883484b3063a",
	name: "hostUndo",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostUndo.__executeServer(opts));
var hostUndo = createServerFn({ method: "POST" }).validator((input) => input).handler(hostUndo_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const loaded = await loadRoom(code);
		if (!loaded) return fail("That table is gone.");
		if (loaded.room.host_token !== data.token) return fail("Only the host can do that.");
		const payload = parsePayload(loaded.room.payload);
		const prev = payload.undo[payload.undo.length - 1];
		if (!prev) {
			const snap = snapshotFor(loaded.room, loaded.players, data.token);
			return snap ? {
				ok: true,
				snapshot: snap
			} : fail("Only the host can do that.");
		}
		const status = prev.phase === "gameOver" ? "over" : "playing";
		if (await writePayload(code, Number(loaded.room.version), status, {
			game: prev,
			undo: payload.undo.slice(0, -1)
		}) === null) continue;
		const again = await loadRoom(code);
		if (!again) return fail("That table is gone.");
		const snapshot = snapshotFor(again.room, again.players, data.token);
		return snapshot ? {
			ok: true,
			snapshot
		} : fail("Only the host can do that.");
	}
	return fail("Could not undo. Try again.");
});
var hostContinue_createServerFn_handler = createServerRpc({
	id: "46ee05ecb350b867c2e9b36b79162af6f53e16efa07b6770e4c692e67b7e8acf",
	name: "hostContinue",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostContinue.__executeServer(opts));
var hostContinue = createServerFn({ method: "POST" }).validator((input) => input).handler(hostContinue_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => {
		const next = advanceRound(game);
		if (next === game) return null;
		return { game: next };
	});
});
var hostRematch_createServerFn_handler = createServerRpc({
	id: "f6a5ae789b1061834a3701ea85ab1c8763e2344acdb9c138f72e50f15eb4d424",
	name: "hostRematch",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostRematch.__executeServer(opts));
var hostRematch = createServerFn({ method: "POST" }).validator((input) => input).handler(hostRematch_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => ({
		game: rematch(game),
		status: "playing"
	}));
});
var hostLobby_createServerFn_handler = createServerRpc({
	id: "c0fe38761cb929c432dc301f704f63eee5a8e298417d27bfedbec9070ecd1eab",
	name: "hostLobby",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostLobby.__executeServer(opts));
var hostLobby = createServerFn({ method: "POST" }).validator((input) => input).handler(hostLobby_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const loaded = await loadRoom(code);
		if (!loaded) return fail("That table is gone.");
		if (loaded.room.host_token !== data.token) return fail("Only the host can do that.");
		if (await writePayload(code, Number(loaded.room.version), "lobby", {
			game: null,
			undo: []
		}) === null) continue;
		const again = await loadRoom(code);
		if (!again) return fail("That table is gone.");
		const snapshot = snapshotFor(again.room, again.players, data.token);
		return snapshot ? {
			ok: true,
			snapshot
		} : fail("Only the host can do that.");
	}
	return fail("Could not return to the lobby.");
});
var hostBank_createServerFn_handler = createServerRpc({
	id: "79e907fa83f33a8247a7f1dc6e97490aeff227a28b2070f19e8a924fd6b62de0",
	name: "hostBank",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => hostBank.__executeServer(opts));
var hostBank = createServerFn({ method: "POST" }).validator((input) => input).handler(hostBank_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string" || typeof data?.playerId !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => {
		const next = confirmBank(game, data.playerId);
		if (next === game) return null;
		return { game: next };
	});
});
var playerBank_createServerFn_handler = createServerRpc({
	id: "2586fade5b8ca0d386f08accb83bdb5ddd38765c51c7dada5da0b0e2d73193e5",
	name: "playerBank",
	filename: "src/lib/game/room.functions.ts"
}, (opts) => playerBank.__executeServer(opts));
var playerBank = createServerFn({ method: "POST" }).validator((input) => input).handler(playerBank_createServerFn_handler, async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const loaded = await loadRoom(code);
		if (!loaded) return fail("That table is gone.");
		if (loaded.room.status === "closed") return fail("This table is closed.");
		const me = loaded.players.find((p) => p.player_token === data.token);
		if (!me) return fail("You are not at this table.");
		const payload = parsePayload(loaded.room.payload);
		if (!payload.game || payload.game.phase !== "playing") return fail("You can't bank right now.");
		const next = confirmBank(payload.game, me.id);
		if (next === payload.game) {
			const snap = snapshotFor(loaded.room, loaded.players, data.token);
			return snap ? {
				ok: true,
				snapshot: snap
			} : fail("You are not at this table.");
		}
		const status = next.phase === "gameOver" ? "over" : "playing";
		if (await writePayload(code, Number(loaded.room.version), status, {
			game: next,
			undo: [...payload.undo, payload.game].slice(-30)
		}) === null) continue;
		const again = await loadRoom(code);
		if (!again) return fail("That table is gone.");
		const snapshot = snapshotFor(again.room, again.players, data.token);
		return snapshot ? {
			ok: true,
			snapshot
		} : fail("You are not at this table.");
	}
	return fail("The table changed. Try BANK again.");
});
//#endregion
export { closeRoom_createServerFn_handler, createRoom_createServerFn_handler, fetchRoom_createServerFn_handler, hostBank_createServerFn_handler, hostContinue_createServerFn_handler, hostLobby_createServerFn_handler, hostRematch_createServerFn_handler, hostRoll_createServerFn_handler, hostSkip_createServerFn_handler, hostUndo_createServerFn_handler, joinRoom_createServerFn_handler, playerBank_createServerFn_handler, setRoomRounds_createServerFn_handler, startRoom_createServerFn_handler };
