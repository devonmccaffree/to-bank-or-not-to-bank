//#region node_modules/.nitro/vite/services/ssr/assets/engine-C76dUDbP.js
function newId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `p_${Math.random().toString(36).slice(2, 10)}`;
}
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
function winners(state) {
	if (state.players.length === 0) return [];
	const max = Math.max(...state.players.map((p) => state.scores[p.id] ?? 0));
	return state.players.filter((p) => (state.scores[p.id] ?? 0) === max);
}
function createGame(names, totalRounds, diceMode) {
	const cleaned = names.map((n) => n.trim()).filter(Boolean).slice(0, 100);
	if (cleaned.length < 2) throw new Error(`Need at least 2 players`);
	const players = cleaned.map((name) => ({
		id: newId(),
		name
	}));
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
		diceMode,
		roundEndReason: null
	};
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
function playerName(state, id) {
	return state.players.find((p) => p.id === id)?.name ?? "Player";
}
//#endregion
export { createGameFromPlayers as a, rematch as c, createGame as i, skipTurn as l, applyRoll as n, isAlwaysDoubles as o, confirmBank as r, playerName as s, advanceRound as t, winners as u };
