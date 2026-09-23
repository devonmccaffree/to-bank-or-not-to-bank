import { n as pokeRoom } from "../_routes/api/table_ws.mjs";
import { t as createServerFn } from "../_libs/@tanstack/start-client-core+[...].mjs";
//#region src/lib/game/engine.ts
function isAlwaysDoubles(sum) {
	return sum === 2 || sum === 12;
}
function resolveDoubles(sum, flagged) {
	if (sum === 7 || sum === 3 || sum === 5 || sum === 9 || sum === 11) return false;
	if (isAlwaysDoubles(sum)) return true;
	return flagged;
}
function nextActivePlayerId(state, afterId) {
	const ids = state.players.map((p) => p.id);
	if (ids.length === 0) return null;
	const start = Math.max(0, ids.indexOf(afterId));
	for (let i = 1; i <= ids.length; i++) {
		const id = ids[(start + i) % ids.length];
		if (!state.bankedThisRound.includes(id)) return id;
	}
	return null;
}
function activePlayerIds(state) {
	return state.players.map((p) => p.id).filter((id) => !state.bankedThisRound.includes(id));
}
function createGameFromPlayers(people, totalRounds) {
	if (people.length < 2) throw new Error(`Need at least 2 players`);
	const players = people.slice(0, 100);
	const scores = {};
	for (const p of players) scores[p.id] = 0;
	return {
		version: 1,
		phase: "playing",
		players,
		scores,
		bankedThisRound: [],
		roundGains: {},
		bankTotal: 0,
		round: 1,
		totalRounds,
		rollsThisRound: 0,
		currentPlayerId: players[0].id,
		lastRollerId: null,
		lastRoll: null,
		roundHistory: [],
		diceMode: "physical",
		roundEndReason: null
	};
}
function applyRoll(state, sum, flaggedDoubles) {
	if (state.phase !== "playing") return state;
	if (sum < 2 || sum > 12) return state;
	const isSafe = state.rollsThisRound < 3;
	const isDoubles = resolveDoubles(sum, flaggedDoubles);
	let bankTotal = state.bankTotal;
	let added = 0;
	let doubled = false;
	let busted = false;
	let display;
	if (sum === 7) {
		if (isSafe) {
			added = 70;
			bankTotal += 70;
			display = "+70";
		} else {
			busted = true;
			display = "7";
		}
	} else if (isDoubles) {
		if (isSafe) {
			added = sum;
			bankTotal += sum;
			display = `+${sum}`;
		} else {
			doubled = true;
			bankTotal = bankTotal * 2;
			display = "×2";
		}
	} else {
		added = sum;
		bankTotal += sum;
		display = `+${sum}`;
	}
	const event = {
		sum,
		isDoubles,
		isSafe,
		added,
		doubled,
		busted,
		bankAfter: busted ? state.bankTotal : bankTotal,
		rollerId: state.currentPlayerId,
		display
	};
	if (busted) return {
		...state,
		lastRoll: event,
		roundHistory: [...state.roundHistory, event],
		rollsThisRound: state.rollsThisRound + 1,
		lastRollerId: state.currentPlayerId,
		phase: "roundEnd",
		roundEndReason: "seven"
	};
	const next = nextActivePlayerId({
		...state,
		lastRollerId: state.currentPlayerId
	}, state.currentPlayerId);
	return {
		...state,
		bankTotal,
		lastRoll: event,
		roundHistory: [...state.roundHistory, event],
		rollsThisRound: state.rollsThisRound + 1,
		lastRollerId: state.currentPlayerId,
		currentPlayerId: next ?? state.currentPlayerId
	};
}
function confirmBank(state, playerId) {
	if (state.phase !== "banking" && state.phase !== "playing") return state;
	if (state.bankTotal <= 0) return state;
	if (state.bankedThisRound.includes(playerId)) return state;
	if (!state.players.some((p) => p.id === playerId)) return state;
	const scores = {
		...state.scores,
		[playerId]: (state.scores[playerId] ?? 0) + state.bankTotal
	};
	const bankedThisRound = [...state.bankedThisRound, playerId];
	const roundGains = {
		...state.roundGains,
		[playerId]: state.bankTotal
	};
	const nextState = {
		...state,
		scores,
		bankedThisRound,
		roundGains,
		phase: "playing"
	};
	if (activePlayerIds(nextState).length === 0) return {
		...nextState,
		phase: "roundEnd",
		roundEndReason: "allBanked"
	};
	if (state.currentPlayerId === playerId) {
		const next = nextActivePlayerId(nextState, playerId);
		return {
			...nextState,
			currentPlayerId: next ?? playerId
		};
	}
	return nextState;
}
function skipTurn(state) {
	if (state.phase !== "playing") return state;
	const next = nextActivePlayerId(state, state.currentPlayerId);
	if (!next || next === state.currentPlayerId) return state;
	return {
		...state,
		currentPlayerId: next
	};
}
function advanceRound(state) {
	if (state.phase !== "roundEnd") return state;
	if (state.round >= state.totalRounds) return {
		...state,
		phase: "gameOver"
	};
	const after = state.lastRollerId ?? state.currentPlayerId;
	const ids = state.players.map((p) => p.id);
	const nextStarter = ids[(Math.max(0, ids.indexOf(after)) + 1) % ids.length] ?? ids[0];
	return {
		...state,
		phase: "playing",
		round: state.round + 1,
		bankTotal: 0,
		bankedThisRound: [],
		roundGains: {},
		rollsThisRound: 0,
		lastRoll: null,
		roundHistory: [],
		roundEndReason: null,
		currentPlayerId: nextStarter
	};
}
function rematch(state) {
	const scores = {};
	for (const p of state.players) scores[p.id] = 0;
	return {
		...state,
		phase: "playing",
		scores,
		bankedThisRound: [],
		roundGains: {},
		bankTotal: 0,
		round: 1,
		rollsThisRound: 0,
		currentPlayerId: state.players[0]?.id ?? "",
		lastRollerId: null,
		lastRoll: null,
		roundHistory: [],
		roundEndReason: null
	};
}
//#endregion
//#region src/lib/game/room.functions.ts
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
	const { getSql } = await import("./db.mjs");
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
createServerFn({ method: "POST" }).handler(async () => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string" || !data.token) return fail("Missing table.");
	return (await readRoomForTokens(code, [data.token]))[data.token] ?? fail("Missing table.");
});
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const code = asCode(data?.code);
	const sum = Number(data?.sum);
	if (!code || typeof data?.token !== "string" || sum < 2 || sum > 12) return fail("Bad roll.");
	return mutateGame(code, data.token, (game) => {
		const next = applyRoll(game, sum, Boolean(data.doubles));
		if (next === game) return null;
		return { game: next };
	});
});
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => {
		const next = skipTurn(game);
		if (next === game) return null;
		return { game: next };
	});
});
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => {
		const next = advanceRound(game);
		if (next === game) return null;
		return { game: next };
	});
});
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => ({
		game: rematch(game),
		status: "playing"
	}));
});
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
	const code = asCode(data?.code);
	if (!code || typeof data?.token !== "string" || typeof data?.playerId !== "string") return fail("Missing table.");
	return mutateGame(code, data.token, (game) => {
		const next = confirmBank(game, data.playerId);
		if (next === game) return null;
		return { game: next };
	});
});
createServerFn({ method: "POST" }).validator((input) => input).handler(async ({ data }) => {
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
export { readRoomForTokens };
