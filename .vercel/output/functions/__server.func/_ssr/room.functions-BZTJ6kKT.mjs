import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/room.functions-BZTJ6kKT.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var room_functions_exports = /* @__PURE__ */ __exportAll({
	closeRoom: () => closeRoom,
	createRoom: () => createRoom,
	fetchRoom: () => fetchRoom,
	hostBank: () => hostBank,
	hostContinue: () => hostContinue,
	hostLobby: () => hostLobby,
	hostRematch: () => hostRematch,
	hostRoll: () => hostRoll,
	hostSkip: () => hostSkip,
	hostUndo: () => hostUndo,
	joinRoom: () => joinRoom,
	playerBank: () => playerBank,
	readRoomForTokens: () => readRoomForTokens,
	setRoomRounds: () => setRoomRounds,
	startRoom: () => startRoom
});
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
var createRoom = createServerFn({ method: "POST" }).handler(createSsrRpc("38888215eb35fcbd97fdde2fd6fdbed049d545f2144fb9a197df240ed8e15f24"));
var joinRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("8fc33566620ba78becaa511fe6ae7b2764f6b3a8d1c62cd4430d138769e1d563"));
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
var fetchRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("86bb4a71c84a1cf9f58a132ab25321b86384ed110214c0e7f56e8925436b0548"));
var closeRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("0a751a71c3e69ff35f2bee6ee41c10ff6145ead55da347f44e09aaf4ddfe92ca"));
var setRoomRounds = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("2112faa984dd2f50f163a23aab0c5c2f9f439b361278ab3fdffa7dd40100937c"));
var startRoom = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("9ae89f63219d212bb3b1cf6ada194bffb03fb7c7a5edc683e7d569511014f27b"));
var hostRoll = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("517382262ce795dfcaa2a358d99b180937ac888e0da7182ace2aaf8246f562c0"));
var hostSkip = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("09d9c80f90339be1aefeaa736357e0cdb634a6eee235cb53489157c5b5ed169b"));
var hostUndo = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("13fb781a5b0cf453381ee42ed02dc3b1002bafcda057b2ecd6e5883484b3063a"));
var hostContinue = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("46ee05ecb350b867c2e9b36b79162af6f53e16efa07b6770e4c692e67b7e8acf"));
var hostRematch = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("f6a5ae789b1061834a3701ea85ab1c8763e2344acdb9c138f72e50f15eb4d424"));
var hostLobby = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("c0fe38761cb929c432dc301f704f63eee5a8e298417d27bfedbec9070ecd1eab"));
var hostBank = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("79e907fa83f33a8247a7f1dc6e97490aeff227a28b2070f19e8a924fd6b62de0"));
var playerBank = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("2586fade5b8ca0d386f08accb83bdb5ddd38765c51c7dada5da0b0e2d73193e5"));
//#endregion
export { hostContinue as a, hostRoll as c, joinRoom as d, playerBank as f, startRoom as h, hostBank as i, hostSkip as l, setRoomRounds as m, createRoom as n, hostLobby as o, room_functions_exports as p, fetchRoom as r, hostRematch as s, closeRoom as t, hostUndo as u };
