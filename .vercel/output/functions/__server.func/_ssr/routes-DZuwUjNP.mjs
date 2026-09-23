import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as hostContinue, c as hostRoll, d as joinRoom, f as playerBank, h as startRoom, i as hostBank, l as hostSkip, m as setRoomRounds, n as createRoom, o as hostLobby, r as fetchRoom, s as hostRematch, t as closeRoom, u as hostUndo } from "./room.functions-BZTJ6kKT.mjs";
import { c as rematch, i as createGame, l as skipTurn, n as applyRoll, o as isAlwaysDoubles, r as confirmBank, s as playerName, t as advanceRound, u as winners } from "./engine-C76dUDbP.mjs";
import { a as Trash2, c as Play, d as ChevronDown, f as BookOpen, l as History, n as Volume2, o as Smartphone, r as Undo2, s as Plus, t as VolumeX, u as ChevronUp } from "../_libs/lucide-react.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DZuwUjNP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[transform,opacity,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:bg-accent/90",
			ghost: "bg-transparent text-fg hover:bg-raised",
			outline: "border border-border bg-transparent text-fg hover:bg-raised",
			subtle: "bg-raised text-fg hover:bg-raised/80",
			danger: "bg-danger text-fg hover:bg-danger/90",
			keypad: "bg-raised text-fg border border-border hover:border-accent/40 hover:bg-surface text-xl font-semibold tabular-nums"
		},
		size: {
			default: "h-11 px-4 text-sm",
			sm: "h-9 px-3 text-sm",
			lg: "h-12 px-5 text-base",
			xl: "h-14 px-6 text-base",
			icon: "size-11",
			keypad: "min-h-14"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var ctx = null;
function audio() {
	if (typeof window === "undefined") return null;
	if (!ctx) {
		const Ctor = window.AudioContext || window.webkitAudioContext;
		if (!Ctor) return null;
		ctx = new Ctor();
	}
	return ctx;
}
function unlockAudio() {
	const ac = audio();
	if (ac && ac.state === "suspended") ac.resume();
}
function tone(ac, freq, duration, when = 0, type = "sine", gain = .07) {
	const osc = ac.createOscillator();
	const g = ac.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	g.gain.setValueAtTime(gain, ac.currentTime + when);
	g.gain.exponentialRampToValueAtTime(1e-4, ac.currentTime + when + duration);
	osc.connect(g);
	g.connect(ac.destination);
	osc.start(ac.currentTime + when);
	osc.stop(ac.currentTime + when + duration + .02);
}
function playAdd() {
	const ac = audio();
	if (!ac) return;
	tone(ac, 520, .09, 0, "triangle", .05);
}
function playSafeSeven() {
	const ac = audio();
	if (!ac) return;
	tone(ac, 392, .1, 0, "triangle", .06);
	tone(ac, 523, .14, .08, "triangle", .05);
}
function playDouble() {
	const ac = audio();
	if (!ac) return;
	tone(ac, 440, .1, 0, "square", .035);
	tone(ac, 660, .16, .09, "square", .03);
}
function playBust() {
	const ac = audio();
	if (!ac) return;
	tone(ac, 220, .22, 0, "sawtooth", .04);
	tone(ac, 130, .32, .06, "sawtooth", .045);
}
function playBank() {
	const ac = audio();
	if (!ac) return;
	tone(ac, 330, .08, 0, "triangle", .05);
	tone(ac, 494, .12, .07, "triangle", .05);
	tone(ac, 660, .16, .14, "triangle", .04);
}
function playWin() {
	const ac = audio();
	if (!ac) return;
	tone(ac, 392, .14, 0, "triangle", .05);
	tone(ac, 494, .14, .12, "triangle", .05);
	tone(ac, 587, .18, .24, "triangle", .05);
	tone(ac, 784, .28, .38, "triangle", .045);
}
function playRoll() {
	const ac = audio();
	if (!ac) return;
	const buffer = ac.createBuffer(1, ac.sampleRate * .18, ac.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
	const src = ac.createBufferSource();
	const filter = ac.createBiquadFilter();
	const g = ac.createGain();
	src.buffer = buffer;
	filter.type = "bandpass";
	filter.frequency.value = 1400;
	g.gain.value = .18;
	src.connect(filter);
	filter.connect(g);
	g.connect(ac.destination);
	src.start();
}
var HISTORY_LIMIT = 20;
function snapshot(game) {
	return structuredClone(game);
}
function pushUndo(undo, game) {
	return [...undo, snapshot(game)].slice(-40);
}
function soundForRoll(game, muted) {
	if (muted) return;
	const roll = game.lastRoll;
	if (!roll) return;
	if (roll.busted) playBust();
	else if (roll.doubled) playDouble();
	else if (roll.sum === 7 && roll.isSafe) playSafeSeven();
	else playAdd();
}
function archiveIfOver(game, pastGames) {
	if (game.phase !== "gameOver") return pastGames;
	const champ = winners(game);
	return [{
		id: `${Date.now()}`,
		playedAt: Date.now(),
		totalRounds: game.totalRounds,
		results: game.players.map((p) => ({
			name: p.name,
			score: game.scores[p.id] ?? 0
		})),
		winnerNames: champ.map((p) => p.name)
	}, ...pastGames].slice(0, HISTORY_LIMIT);
}
var useGameStore = create()(persist((set, get) => ({
	screen: "home",
	game: null,
	undo: [],
	pastGames: [],
	muted: false,
	setupPlayers: ["", ""],
	setupRounds: 20,
	setupDiceMode: "physical",
	doublesOn: false,
	rolling: false,
	dice: [1, 1],
	flash: null,
	hydrated: false,
	setHydrated: () => set({ hydrated: true }),
	setScreen: (screen) => set({ screen }),
	setSetupPlayers: (setupPlayers) => set({ setupPlayers }),
	setSetupRounds: (setupRounds) => set({ setupRounds }),
	setSetupDiceMode: (setupDiceMode) => set({ setupDiceMode }),
	setDoublesOn: (doublesOn) => set({ doublesOn }),
	toggleMute: () => set({ muted: !get().muted }),
	startGame: () => {
		unlockAudio();
		try {
			const { setupPlayers, setupRounds, setupDiceMode } = get();
			set({
				game: createGame(setupPlayers, setupRounds, "physical"),
				undo: [],
				screen: "play",
				doublesOn: false,
				rolling: false,
				flash: null,
				dice: [1, 1]
			});
			return null;
		} catch (err) {
			return err instanceof Error ? err.message : "Could not start";
		}
	},
	enterRoll: (sum, flaggedDoubles) => {
		const { game, undo, doublesOn, muted, rolling } = get();
		if (!game || rolling) return;
		unlockAudio();
		const next = applyRoll(game, sum, flaggedDoubles ?? doublesOn);
		if (next === game) return;
		soundForRoll(next, muted);
		const flash = next.lastRoll ? next.lastRoll.busted ? {
			text: "Seven — bank is gone",
			kind: "bust"
		} : next.lastRoll.doubled ? {
			text: `Doubles · ${game.bankTotal} → ${next.bankTotal}`,
			kind: "double"
		} : next.lastRoll.isDoubles && next.lastRoll.isSafe ? {
			text: `Safe doubles · +${next.lastRoll.added}`,
			kind: "add"
		} : next.lastRoll.sum === 7 ? {
			text: "Safe seven · +70",
			kind: "safe"
		} : {
			text: next.lastRoll.display,
			kind: "add"
		} : null;
		set({
			game: next,
			undo: pushUndo(undo, game),
			doublesOn: false,
			flash
		});
	},
	rollDigital: () => {
		const { game, rolling, muted } = get();
		if (!game || rolling || game.phase !== "playing") return;
		unlockAudio();
		if (!muted) playRoll();
		set({ rolling: true });
		const d1 = 1 + Math.floor(Math.random() * 6);
		const d2 = 1 + Math.floor(Math.random() * 6);
		window.setTimeout(() => {
			set({
				dice: [d1, d2],
				rolling: false
			});
			get().enterRoll(d1 + d2, d1 === d2);
		}, 700);
	},
	pickBanker: (playerId) => {
		const { game, undo, muted, rolling } = get();
		if (!game || rolling) return;
		unlockAudio();
		const next = confirmBank(game, playerId);
		if (next === game) return;
		if (!muted) playBank();
		const name = playerName(next, playerId);
		const gained = next.roundGains[playerId] ?? 0;
		set({
			game: next,
			undo: pushUndo(undo, game),
			flash: {
				text: `${name} banked ${gained}`,
				kind: "bank"
			}
		});
	},
	skip: () => {
		const { game, undo } = get();
		if (!game) return;
		const next = skipTurn(game);
		if (next === game) return;
		set({
			game: next,
			undo: pushUndo(undo, game)
		});
	},
	undoLast: () => {
		const { undo } = get();
		const prev = undo[undo.length - 1];
		if (!prev) return;
		set({
			game: prev,
			undo: undo.slice(0, -1),
			rolling: false,
			doublesOn: false,
			flash: null
		});
	},
	continueRound: () => {
		const { game, undo, muted, pastGames } = get();
		if (!game) return;
		const next = advanceRound(game);
		const archived = archiveIfOver(next, pastGames);
		if (next.phase === "gameOver" && !muted) playWin();
		set({
			game: next,
			undo: pushUndo(undo, game),
			pastGames: archived,
			flash: null
		});
	},
	playAgain: () => {
		const { game } = get();
		if (!game) return;
		set({
			game: rematch(game),
			undo: [],
			doublesOn: false,
			flash: null,
			rolling: false
		});
	},
	changePlayers: () => {
		const { game } = get();
		set({
			screen: "setup",
			setupPlayers: game ? game.players.map((p) => p.name) : get().setupPlayers,
			game: null,
			undo: [],
			flash: null
		});
	},
	abandonGame: () => {
		set({
			game: null,
			undo: [],
			screen: "home",
			flash: null
		});
	}
}), {
	name: "bank-table-v1",
	version: 1,
	partialize: (s) => ({
		screen: s.screen === "play" && s.game ? "play" : s.screen === "play" ? "home" : s.screen,
		game: s.game,
		pastGames: s.pastGames,
		muted: s.muted,
		setupPlayers: s.setupPlayers,
		setupRounds: s.setupRounds,
		setupDiceMode: s.setupDiceMode
	}),
	merge: (persisted, current) => {
		const saved = persisted ?? {};
		const game = saved.game ? {
			...saved.game,
			phase: saved.game.phase === "banking" ? "playing" : saved.game.phase
		} : current.game;
		return {
			...current,
			...saved,
			game
		};
	}
}));
function HistoryScreen() {
	const pastGames = useGameStore((s) => s.pastGames);
	const setScreen = useGameStore((s) => s.setScreen);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12 pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "self-start text-sm text-muted hover:text-fg",
				onClick: () => setScreen("home"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-3 text-title font-medium tracking-tight",
				children: "Past games"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Kept on this device only."
			}),
			pastGames.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-12 text-sm text-muted",
				children: "No games yet. Finish a table and it will show up here."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-8 space-y-3",
				children: pastGames.map((g) => {
					const date = new Date(g.playedAt);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg border border-border bg-surface p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: g.winnerNames.length > 1 ? `${g.winnerNames.join(" & ")} tied` : `${g.winnerNames[0] ?? "—"} won`
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs tabular-nums text-faint",
								children: [
									date.toLocaleDateString(void 0, {
										month: "short",
										day: "numeric"
									}),
									" · ",
									g.totalRounds,
									"r"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "mt-3 space-y-1",
							children: [...g.results].sort((a, b) => b.score - a.score).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex justify-between text-sm text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: r.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-fg",
									children: r.score
								})]
							}, r.name + r.score))
						})]
					}, g.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				className: "mt-10 rounded-lg",
				onClick: () => setScreen("setup"),
				children: "Start a game"
			})
		]
	});
}
var SESSION_KEY = "bank-table-session";
function saveSession(session) {
	try {
		if (!session) localStorage.removeItem(SESSION_KEY);
		else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	} catch {}
}
function readSession() {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed?.code || !parsed.token || parsed.role !== "host" && parsed.role !== "player") return null;
		return parsed;
	} catch {
		return null;
	}
}
function modeFor(snapshot) {
	if (snapshot.status === "lobby" || snapshot.status === "closed" || !snapshot.game) return "lobby";
	return "play";
}
function flashFor(prev, next) {
	const game = next.game;
	const before = prev?.game;
	if (!game || !before || prev?.version === next.version) return null;
	if (game.lastRoll && game.lastRoll !== before.lastRoll && game.rollsThisRound !== before.rollsThisRound) {
		const roll = game.lastRoll;
		if (roll.busted) return {
			text: "Seven — bank is gone",
			kind: "bust"
		};
		if (roll.doubled) return {
			text: `Doubles · ${before.bankTotal} → ${roll.bankAfter}`,
			kind: "double"
		};
		if (roll.sum === 7 && roll.isSafe) return {
			text: "Safe seven · +70",
			kind: "safe"
		};
		return {
			text: roll.display,
			kind: "add"
		};
	}
	const added = game.bankedThisRound.find((id) => !before.bankedThisRound.includes(id));
	if (added) return {
		text: `${playerName(game, added)} banked ${game.roundGains[added] ?? 0}`,
		kind: "bank"
	};
	if (game.phase === "gameOver" && before.phase !== "gameOver") return null;
	return null;
}
function soundFor(flash, muted = false) {
	if (!flash || muted) return;
	if (flash.kind === "bust") playBust();
	else if (flash.kind === "double") playDouble();
	else if (flash.kind === "safe") playSafeSeven();
	else if (flash.kind === "bank") playBank();
	else playAdd();
}
var useRoomStore = create((set, get) => {
	let pollTimer = null;
	let socket = null;
	let reconnectTimer = null;
	let live = false;
	function stopLive() {
		live = false;
		if (pollTimer) clearTimeout(pollTimer);
		pollTimer = null;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = null;
		if (socket) {
			socket.onclose = null;
			socket.close();
			socket = null;
		}
	}
	function schedulePoll(delay) {
		if (pollTimer || !get().session) return;
		pollTimer = setTimeout(async () => {
			pollTimer = null;
			if (!get().session || live) return;
			const session = get().session;
			if (!session) return;
			try {
				const result = await fetchRoom({ data: {
					code: session.code,
					token: session.token
				} });
				if (get().session?.token !== session.token) return;
				applyResult(result, true);
			} catch {}
			if (get().session && !live) schedulePoll(1200);
		}, delay);
	}
	function connectSocket() {
		const session = get().session;
		if (!session || live) return;
		if (typeof WebSocket === "undefined") {
			schedulePoll(200);
			return;
		}
		const proto = location.protocol === "https:" ? "wss:" : "ws:";
		const q = new URLSearchParams({
			code: session.code,
			token: session.token
		});
		const ws = new WebSocket(`${proto}//${location.host}/api/table-ws?${q}`);
		socket = ws;
		const opened = { ok: false };
		const giveUp = setTimeout(() => {
			if (!opened.ok && socket === ws) schedulePoll(0);
		}, 2e3);
		ws.onopen = () => {
			opened.ok = true;
			clearTimeout(giveUp);
			if (socket !== ws) return;
			live = true;
			if (pollTimer) clearTimeout(pollTimer);
			pollTimer = null;
		};
		ws.onmessage = (event) => {
			if (socket !== ws || get().session?.token !== session.token) return;
			try {
				applyResult(JSON.parse(String(event.data)), true);
			} catch {}
		};
		ws.onerror = () => {
			ws.close();
		};
		ws.onclose = () => {
			clearTimeout(giveUp);
			if (socket === ws) socket = null;
			const wasLive = live;
			live = false;
			if (!get().session) return;
			if (!wasLive) schedulePoll(0);
			else schedulePoll(200);
			if (reconnectTimer) clearTimeout(reconnectTimer);
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				if (get().session) connectSocket();
			}, 800);
		};
	}
	function startLive() {
		if (socket || reconnectTimer) return;
		connectSocket();
	}
	function applyResult(result, sound) {
		if (!result.ok) {
			if (result.error.includes("closed") || result.error.includes("gone") || result.error.includes("not at")) {
				saveSession(null);
				stopLive();
				set({
					session: null,
					snapshot: null,
					mode: null,
					error: result.error,
					busy: false
				});
				return;
			}
			set({
				error: result.error,
				busy: false
			});
			return;
		}
		const prev = get().snapshot;
		if (prev && result.snapshot.version < prev.version) return;
		const flash = prev && prev.version !== result.snapshot.version ? flashFor(prev, result.snapshot) : null;
		if (sound && result.snapshot.you === "host") soundFor(flash);
		if (result.snapshot.game?.phase === "gameOver" && prev?.game?.phase !== "gameOver" && result.snapshot.you === "host") playWin();
		set({
			snapshot: result.snapshot,
			mode: modeFor(result.snapshot),
			error: null,
			busy: false,
			flash: prev && prev.version !== result.snapshot.version ? flash : get().flash
		});
	}
	async function hostCall(run) {
		const session = get().session;
		if (!session || session.role !== "host" || get().busy) return;
		set({
			busy: true,
			error: null
		});
		try {
			applyResult(await run(session), true);
		} catch {
			set({
				busy: false,
				error: "Could not reach the table."
			});
		}
	}
	return {
		mode: null,
		session: null,
		snapshot: null,
		flash: null,
		error: null,
		busy: false,
		restore: async () => {
			const session = readSession();
			if (!session || get().session) return;
			set({
				session,
				busy: true
			});
			try {
				const result = await fetchRoom({ data: {
					code: session.code,
					token: session.token
				} });
				if (!result.ok) {
					saveSession(null);
					set({
						session: null,
						mode: null,
						busy: false,
						error: null
					});
					return;
				}
				applyResult(result, false);
				startLive();
			} catch {
				set({ busy: false });
			}
		},
		openJoin: () => {
			stopLive();
			set({
				mode: "join",
				error: null
			});
		},
		hostTable: async () => {
			if (get().busy) return;
			unlockAudio();
			set({
				busy: true,
				error: null
			});
			try {
				const result = await createRoom();
				if (!result.ok || !result.token) {
					set({
						busy: false,
						error: result.ok ? "Could not open a table." : result.error
					});
					return;
				}
				const session = {
					role: "host",
					code: result.snapshot.code,
					token: result.token,
					playerId: null
				};
				saveSession(session);
				set({
					session,
					busy: false
				});
				applyResult(result, false);
				startLive();
			} catch {
				set({
					busy: false,
					error: "Could not open a table."
				});
			}
		},
		join: async (code, name) => {
			if (get().busy) return;
			unlockAudio();
			set({
				busy: true,
				error: null
			});
			try {
				const result = await joinRoom({ data: {
					code,
					name
				} });
				if (!result.ok || !result.token) {
					set({
						busy: false,
						error: result.ok ? "Could not join." : result.error
					});
					return;
				}
				const session = {
					role: "player",
					code: result.snapshot.code,
					token: result.token,
					playerId: result.playerId ?? result.snapshot.youId
				};
				saveSession(session);
				set({ session });
				applyResult(result, false);
				startLive();
			} catch {
				set({
					busy: false,
					error: "Could not join that table."
				});
			}
		},
		setRounds: async (rounds) => {
			await hostCall((session) => setRoomRounds({ data: {
				code: session.code,
				token: session.token,
				rounds
			} }));
		},
		start: async () => {
			unlockAudio();
			await hostCall((session) => startRoom({ data: {
				code: session.code,
				token: session.token
			} }));
		},
		roll: async (sum, doubles) => {
			unlockAudio();
			await hostCall((session) => hostRoll({ data: {
				code: session.code,
				token: session.token,
				sum,
				doubles
			} }));
		},
		skip: async () => {
			await hostCall((session) => hostSkip({ data: {
				code: session.code,
				token: session.token
			} }));
		},
		undo: async () => {
			await hostCall((session) => hostUndo({ data: {
				code: session.code,
				token: session.token
			} }));
		},
		next: async () => {
			await hostCall((session) => hostContinue({ data: {
				code: session.code,
				token: session.token
			} }));
		},
		bank: async (playerId) => {
			unlockAudio();
			await hostCall((session) => hostBank({ data: {
				code: session.code,
				token: session.token,
				playerId
			} }));
		},
		bankSelf: async () => {
			const session = get().session;
			if (!session || session.role !== "player" || get().busy) return;
			unlockAudio();
			set({
				busy: true,
				error: null
			});
			try {
				const result = await playerBank({ data: {
					code: session.code,
					token: session.token
				} });
				if (result.ok) playBank();
				applyResult(result, false);
			} catch {
				set({
					busy: false,
					error: "Could not bank."
				});
			}
		},
		rematch: async () => {
			await hostCall((session) => hostRematch({ data: {
				code: session.code,
				token: session.token
			} }));
		},
		backToLobby: async () => {
			await hostCall((session) => hostLobby({ data: {
				code: session.code,
				token: session.token
			} }));
		},
		leave: async () => {
			const session = get().session;
			stopLive();
			saveSession(null);
			set({
				session: null,
				snapshot: null,
				mode: null,
				flash: null,
				error: null,
				busy: false
			});
			if (session?.role === "host") try {
				await closeRoom({ data: {
					code: session.code,
					token: session.token
				} });
			} catch {}
		}
	};
});
function HomeScreen() {
	const setScreen = useGameStore((s) => s.setScreen);
	const game = useGameStore((s) => s.game);
	const hostTable = useRoomStore((s) => s.hostTable);
	const openJoin = useRoomStore((s) => s.openJoin);
	const busy = useRoomStore((s) => s.busy);
	const error = useRoomStore((s) => s.error);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-between px-5 pb-10 pt-16 sm:pt-24",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-kicker font-medium uppercase tracking-[0.22em] text-muted",
				children: "Table dice game"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-3 text-display font-medium leading-[0.9] tracking-[-0.04em]",
				children: "BANK"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 max-w-sm text-lg leading-snug text-muted",
				children: "One screen keeps score. Everyone else joins with a code and taps BANK from their phone."
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-12 flex flex-col gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "xl",
					className: "w-full rounded-lg",
					disabled: busy,
					onClick: () => void hostTable(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), "Host a table"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "xl",
					variant: "outline",
					className: "w-full rounded-lg",
					onClick: openJoin,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "size-4" }), "Join with a code"]
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "lg",
						className: "rounded-lg",
						onClick: () => setScreen("setup"),
						children: "This device only"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "lg",
						className: "rounded-lg",
						onClick: () => setScreen("how"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "size-4" }), "Rules"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					className: "text-muted",
					onClick: () => setScreen("history"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "size-4" }), "Past games"]
				}),
				game && game.phase !== "gameOver" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					className: "text-muted",
					onClick: () => setScreen("play"),
					children: "Resume on this device"
				}) : null
			]
		})]
	});
}
var ROUNDS = [
	10,
	15,
	20
];
function HostLobby() {
	const snapshot = useRoomStore((s) => s.snapshot);
	const error = useRoomStore((s) => s.error);
	const busy = useRoomStore((s) => s.busy);
	const setRounds = useRoomStore((s) => s.setRounds);
	const start = useRoomStore((s) => s.start);
	const leave = useRoomStore((s) => s.leave);
	if (!snapshot) return null;
	const ready = snapshot.players.length >= 2;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "self-start text-sm text-muted hover:text-fg",
				onClick: () => void leave(),
				children: "Close table"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-kicker font-medium uppercase tracking-[0.22em] text-muted",
				children: "Table code"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display mt-2 text-display font-medium tracking-[0.18em] tabular-nums",
				children: snapshot.code
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-sm text-sm text-muted",
				children: "Everyone else opens this on their phone, taps Join, and enters the code. When the game starts they tap BANK themselves."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-kicker font-medium uppercase tracking-[0.18em] text-muted",
					children: "Rounds"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid grid-cols-3 gap-2",
					children: ROUNDS.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => void setRounds(n),
						className: cn("h-12 rounded-md border text-sm font-medium tabular-nums", snapshot.totalRounds === n ? "border-accent bg-accent text-accent-fg" : "border-border bg-raised text-fg"),
						children: n
					}, n))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "text-kicker font-medium uppercase tracking-[0.18em] text-muted",
					children: ["Joined · ", snapshot.players.length]
				}), snapshot.players.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Waiting for the first phone."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "mt-3 max-h-64 overflow-y-auto rounded-lg border border-border",
					children: snapshot.players.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3 border-t border-border px-3 py-3 first:border-t-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-6 tabular-nums text-faint",
							children: i + 1
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: p.name
						})]
					}, p.id))
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-danger",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "xl",
				className: "mt-8 w-full rounded-lg",
				disabled: !ready || busy,
				onClick: () => void start(),
				children: ready ? "Start the game" : "Need 2 players"
			})
		]
	});
}
var STEPS = [
	{
		title: "Object",
		body: "Be the player who banks the most points after 10, 15, or 20 rounds. Most tables play 20."
	},
	{
		title: "Setup",
		body: "Add every name. Choose a scorekeeper — the banker — to run this screen. Each turn uses two dice, shared or one pair each."
	},
	{
		title: "Rolling",
		body: "Play clockwise. On a turn, roll both dice and enter the total on the pad. That number is added to the shared BANK."
	},
	{
		title: "The first three",
		body: "The first three rolls of every round are safe. A seven is worth 70 and does not end the round. Doubles in these rolls do not double the bank — two fives add 10."
	},
	{
		title: "After that",
		body: "Starting with the fourth roll, a seven busts the bank and ends the round. Press a number to add it. Press Doubles — or 2 or 12 — to double the whole BANK. The first three rolls never double."
	},
	{
		title: "Banking",
		body: "When someone calls BANK, tap their name on the scoreboard. They take the current pot into their personal score — once per round — then sit out until the next round. There is no limit to how many people bank the same pot. Players who never bank that round score nothing from it."
	},
	{
		title: "Ending a round",
		body: "A round ends when a seven is rolled after the safe three, or when every player has banked. Then the pot resets and everyone can roll and bank again."
	}
];
function HowToScreen() {
	const setScreen = useGameStore((s) => s.setScreen);
	const game = useGameStore((s) => s.game);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12 pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "self-start text-sm text-muted hover:text-fg",
				onClick: () => setScreen(game ? "play" : "home"),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-3 text-title font-medium tracking-tight",
				children: "How to play"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Quick, loud, and made for a table of two or a hundred."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-8 space-y-6",
				children: STEPS.map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-kicker font-medium uppercase tracking-[0.18em] text-muted",
						children: String(i + 1).padStart(2, "0")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-medium text-fg",
						children: step.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-relaxed text-muted",
						children: step.body
					})
				] }, step.title))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-10 rounded-lg border border-border bg-surface p-4 text-sm text-muted",
				children: "House notes from the original table: only the roller calls the number on the dice, and saying the word BANK — even by accident — banks you out of the round."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "lg",
				className: "mt-8 w-full rounded-lg",
				onClick: () => setScreen(game ? "play" : "setup"),
				children: game ? "Back to the table" : "Set up a game"
			})
		]
	});
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-11 w-full rounded-md border border-border bg-raised px-3 text-base text-fg shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
function JoinTable() {
	const join = useRoomStore((s) => s.join);
	const leave = useRoomStore((s) => s.leave);
	const error = useRoomStore((s) => s.error);
	const busy = useRoomStore((s) => s.busy);
	const [code, setCode] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "self-start text-sm text-muted hover:text-fg",
				onClick: () => void leave(),
				children: "Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-6 text-title font-medium tracking-tight",
				children: "Join a table"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Enter the 4-digit code from the host’s screen."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "mt-8 text-kicker font-medium uppercase tracking-[0.18em] text-muted",
				htmlFor: "table-code",
				children: "Code"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "table-code",
				inputMode: "numeric",
				autoComplete: "off",
				maxLength: 4,
				value: code,
				placeholder: "0000",
				className: "mt-2 text-center font-display text-3xl tracking-[0.3em] tabular-nums",
				onChange: (e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "mt-6 text-kicker font-medium uppercase tracking-[0.18em] text-muted",
				htmlFor: "table-name",
				children: "Your name"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "table-name",
				value: name,
				maxLength: 18,
				autoComplete: "off",
				placeholder: "Name at the table",
				className: "mt-2",
				onChange: (e) => setName(e.target.value)
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-danger",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "xl",
				className: "mt-8 w-full rounded-lg",
				disabled: busy || code.length !== 4 || name.trim().length === 0,
				onClick: () => void join(code, name),
				children: "Join"
			})
		]
	});
}
function PlayerRemote() {
	const snapshot = useRoomStore((s) => s.snapshot);
	const error = useRoomStore((s) => s.error);
	const busy = useRoomStore((s) => s.busy);
	const bankSelf = useRoomStore((s) => s.bankSelf);
	const leave = useRoomStore((s) => s.leave);
	if (!snapshot) return null;
	const game = snapshot.game;
	const me = snapshot.players.find((p) => p.id === snapshot.youId);
	if (!game || snapshot.status === "lobby") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "self-start text-sm text-muted hover:text-fg",
				onClick: () => void leave(),
				children: "Leave"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-10 text-kicker font-medium uppercase tracking-[0.22em] text-muted",
				children: ["Code ", snapshot.code]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-3 text-title font-medium tracking-tight",
				children: me?.name ?? "You’re in"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Waiting for the host to start. You’ll tap BANK on this phone once the dice are rolling."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-8 text-sm tabular-nums text-faint",
				children: [snapshot.players.length, " joined"]
			})
		]
	});
	const banked = game.bankedThisRound.includes(snapshot.youId ?? "");
	const gain = snapshot.youId ? game.roundGains[snapshot.youId] : void 0;
	const score = snapshot.youId ? game.scores[snapshot.youId] ?? 0 : 0;
	const canBank = game.phase === "playing" && game.bankTotal > 0 && !banked && !busy;
	const isSafe = game.rollsThisRound < 3;
	const ranked = [...game.players].sort((a, b) => (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0));
	const champs = winners(game);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "text-sm text-muted hover:text-fg",
					onClick: () => void leave(),
					children: "Leave"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm tabular-nums text-muted",
					children: [
						"Round ",
						game.round,
						"/",
						game.totalRounds
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-center text-kicker font-medium uppercase tracking-[0.28em] text-muted",
				children: "Bank"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-bank text-center font-medium leading-none tabular-nums",
				children: game.phase === "roundEnd" && game.roundEndReason === "seven" ? 0 : game.bankTotal
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-center text-sm text-muted",
				children: [
					me?.name,
					" · ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular-nums text-fg",
						children: score
					}),
					gain ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-safe",
						children: [
							" · +",
							gain,
							" this round"
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-center text-xs uppercase tracking-[0.16em] text-faint",
				children: game.phase === "playing" ? isSafe ? "Safe rolls" : "A 7 busts" : game.phase === "gameOver" ? "Game over" : "Between rounds"
			}),
			game.phase === "playing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "xl",
				className: cn("mt-10 h-24 w-full rounded-xl text-2xl", !canBank && "opacity-40"),
				disabled: !canBank,
				onClick: () => void bankSelf(),
				children: banked ? "You’re out this round" : "BANK"
			}) : null,
			game.phase === "gameOver" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display mt-8 text-center text-2xl font-medium",
				children: champs.length > 1 ? `${champs.map((p) => p.name).join(" & ")} tie` : `${champs[0]?.name} wins`
			}) : null,
			game.phase !== "playing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-6 max-h-[50dvh] overflow-y-auto rounded-lg border border-border",
				children: ranked.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: cn("flex items-baseline justify-between border-t border-border px-3 py-2.5 first:border-t-0", p.id === snapshot.youId && "bg-raised"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "truncate",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mr-3 tabular-nums text-faint",
							children: i + 1
						}), p.name]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display text-xl tabular-nums",
						children: game.scores[p.id] ?? 0
					})]
				}, p.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-center text-sm text-muted",
				children: banked ? "Your points are locked. Watch the pot until the next round." : "Tap BANK to take the pot before someone rolls a 7."
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-center text-sm text-danger",
				children: error
			}) : null
		]
	});
}
var TableContext = (0, import_react.createContext)(null);
function TableProvider({ value, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableContext.Provider, {
		value,
		children
	});
}
function useTable() {
	return (0, import_react.useContext)(TableContext);
}
var PAD = [
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12
];
function PlayScreen() {
	const table = useTable();
	const localGame = useGameStore((s) => s.game);
	const localFlash = useGameStore((s) => s.flash);
	const undo = useGameStore((s) => s.undo);
	const muted = useGameStore((s) => s.muted);
	const enterRollLocal = useGameStore((s) => s.enterRoll);
	const pickBankerLocal = useGameStore((s) => s.pickBanker);
	const skipLocal = useGameStore((s) => s.skip);
	const undoLocal = useGameStore((s) => s.undoLast);
	const continueLocal = useGameStore((s) => s.continueRound);
	const playAgainLocal = useGameStore((s) => s.playAgain);
	const changePlayersLocal = useGameStore((s) => s.changePlayers);
	const abandonLocal = useGameStore((s) => s.abandonGame);
	const toggleMute = useGameStore((s) => s.toggleMute);
	const setScreen = useGameStore((s) => s.setScreen);
	const game = table?.game ?? localGame;
	const flash = table ? table.flash : localFlash;
	const canUndo = table ? table.canUndo : undo.length > 0;
	const enterRoll = table ? table.enterRoll : enterRollLocal;
	const pickBanker = table ? table.bank : pickBankerLocal;
	const skip = table ? table.skip : skipLocal;
	const undoLast = table ? table.undo : undoLocal;
	const continueRound = table ? table.next : continueLocal;
	const playAgain = table ? table.playAgain : playAgainLocal;
	const changePlayers = table ? table.backToLobby : changePlayersLocal;
	const abandonGame = table ? table.leave : abandonLocal;
	if (!game) return null;
	const roller = playerName(game, game.currentPlayerId);
	const safeLeft = Math.max(0, 3 - game.rollsThisRound);
	const isSafe = game.rollsThisRound < 3;
	const canAct = game.phase === "playing";
	const champs = winners(game);
	const ranked = [...game.players].sort((a, b) => (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-8 pt-4 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-sm text-muted hover:text-fg",
							onClick: () => void abandonGame(),
							children: "Exit"
						}),
						table ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums tracking-[0.16em] text-fg",
							children: table.code
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-faint",
							children: "/"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm tabular-nums text-muted",
							children: [
								"Round ",
								game.round,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-faint",
									children: ["/", game.totalRounds]
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1",
					children: [
						table ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-md p-2 text-muted hover:text-fg",
							onClick: () => setScreen("how"),
							"aria-label": "How to play",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-md p-2 text-muted hover:text-fg",
							onClick: toggleMute,
							"aria-label": muted ? "Unmute" : "Mute",
							children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rounded-md p-2 text-muted hover:text-fg disabled:opacity-30",
							onClick: undoLast,
							disabled: !canUndo,
							"aria-label": "Undo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "size-4" })
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_20rem] lg:items-start",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-center text-kicker font-medium uppercase tracking-[0.28em] text-muted",
								children: "Bank"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: cn("font-display text-bank text-center font-medium leading-none tracking-[-0.05em] tabular-nums", game.phase === "roundEnd" && game.roundEndReason === "seven" && "animate-[bust-shake_0.4s_ease-in-out] text-danger"),
								children: game.phase === "roundEnd" && game.roundEndReason === "seven" ? 0 : game.bankTotal
							}, game.bankTotal + (game.lastRoll?.display ?? "")),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex flex-col items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]", isSafe && game.phase !== "roundEnd" ? "bg-safe/15 text-safe" : "bg-danger/15 text-danger"),
									children: game.phase === "roundEnd" ? game.roundEndReason === "seven" ? "Busted" : "All banked" : isSafe ? `Safe · ${safeLeft} left` : "Hot · a 7 busts"
								}), flash ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: cn("animate-[flash-in_0.25s_ease-out] text-sm", flash.kind === "bust" && "text-danger", flash.kind === "double" && "text-fg", flash.kind === "bank" && "text-safe", flash.kind === "safe" && "text-safe", flash.kind === "add" && "text-muted"),
									children: flash.text
								}, flash.text + flash.kind) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: game.phase === "playing" ? `${roller} rolls` : "\xA0"
								})]
							}),
							game.roundHistory.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
								className: "mt-4 flex flex-wrap justify-center gap-1.5",
								children: game.roundHistory.map((roll, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
									className: cn("rounded-full border border-border px-2.5 py-0.5 text-xs tabular-nums text-muted", roll.busted && "border-danger/40 text-danger", roll.doubled && "text-fg"),
									children: roll.display
								}, `${roll.display}-${i}`))
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "rounded-xl border border-border bg-surface p-3 sm:p-4 lg:row-span-2 lg:sticky lg:top-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-3 px-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-kicker font-medium uppercase tracking-[0.18em] text-muted",
								children: "Players"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-faint",
								children: canAct && game.bankTotal > 0 ? `Tap a name to bank ${game.bankTotal}` : "Tap a name to bank"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "mt-2 max-h-72 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-7rem)]",
							children: game.players.map((p) => {
								const banked = game.bankedThisRound.includes(p.id);
								const isTurn = p.id === game.currentPlayerId && game.phase === "playing";
								const gain = game.roundGains[p.id];
								const canTap = canAct && !banked && game.bankTotal > 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
									className: "border-t border-border first:border-t-0",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: !canTap,
										onClick: () => pickBanker(p.id),
										className: cn("flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-150", canTap && "hover:bg-raised", banked && "opacity-50", !canTap && "cursor-default"),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: cn("truncate font-medium", isTurn && "text-accent"),
												children: [p.name, isTurn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "ml-2 text-kicker font-medium uppercase tracking-[0.14em] text-muted",
													children: "rolls"
												}) : null]
											}), gain ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs tabular-nums text-safe",
												children: [
													"+",
													gain,
													" this round"
												]
											}) : banked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-faint",
												children: "Sat out"
											}) : canTap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs text-muted",
												children: ["Bank ", game.bankTotal]
											}) : null]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-display text-xl tabular-nums",
											children: game.scores[p.id] ?? 0
										})]
									})
								}, p.id);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-2",
								children: [PAD.map((n) => {
									const isSeven = n === 7;
									const always = isAlwaysDoubles(n);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "keypad",
										size: "keypad",
										disabled: !canAct,
										onClick: () => enterRoll(n, isAlwaysDoubles(n)),
										className: cn("rounded-lg", isSeven && "border-danger/50 text-danger hover:border-danger", always && "border-accent/50"),
										children: [n, always ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-kicker font-medium uppercase tracking-wider text-faint",
											children: "doubles"
										}) : null]
									}, n);
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "keypad",
									size: "keypad",
									disabled: !canAct || isSafe,
									onClick: () => enterRoll(2, true),
									className: "rounded-lg",
									children: "Doubles"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-center text-xs text-faint",
								children: isSafe ? "First three rolls add the number. Doubles does not double yet." : "A number adds that many. Doubles doubles the bank. 2 and 12 are doubles."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "lg",
								variant: "subtle",
								className: "mt-4 w-full rounded-lg",
								disabled: !canAct,
								onClick: skip,
								children: ["Skip ", roller]
							})
						]
					})
				]
			}),
			game.phase === "roundEnd" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Overlay, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-kicker font-medium uppercase tracking-[0.22em] text-muted",
					children: [
						"Round ",
						game.round,
						" closed",
						game.roundEndReason === "seven" ? " · seven" : ""
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display mt-2 text-3xl font-medium tracking-tight",
					children: "Leaderboard"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "mt-6 max-h-[50dvh] w-full overflow-y-auto",
					children: ranked.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-baseline justify-between gap-3 border-t border-border py-2.5 first:border-t-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 truncate",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mr-3 tabular-nums text-faint",
								children: i + 1
							}), p.name]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "shrink-0 text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-2xl tabular-nums",
								children: game.scores[p.id] ?? 0
							}), game.roundGains[p.id] ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-2 text-xs tabular-nums text-safe",
								children: ["+", game.roundGains[p.id]]
							}) : null]
						})]
					}, p.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "lg",
					className: "mt-6 w-full rounded-lg",
					onClick: continueRound,
					children: game.round >= game.totalRounds ? "See results" : "Next round"
				})
			] }) : null,
			game.phase === "gameOver" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Overlay, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-kicker font-medium uppercase tracking-[0.22em] text-muted",
					children: "Final table"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display mt-2 text-3xl font-medium tracking-tight",
					children: champs.length > 1 ? `${champs.map((p) => p.name).join(" & ")} tie` : `${champs[0]?.name} wins`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "mt-6 w-full space-y-2",
					children: ranked.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mr-3 tabular-nums text-faint",
								children: i + 1
							}), p.name]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-2xl tabular-nums",
							children: game.scores[p.id] ?? 0
						})]
					}, p.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 grid w-full grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "lg",
						className: "rounded-lg",
						onClick: changePlayers,
						children: "Change table"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "rounded-lg",
						onClick: playAgain,
						children: "Same players"
					})]
				})
			] }) : null
		]
	});
}
function Overlay({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-panel",
			children
		})
	});
}
var ROUND_OPTIONS = [
	10,
	15,
	20
];
function SetupScreen() {
	const setupPlayers = useGameStore((s) => s.setupPlayers);
	const setupRounds = useGameStore((s) => s.setupRounds);
	const setSetupPlayers = useGameStore((s) => s.setSetupPlayers);
	const setSetupRounds = useGameStore((s) => s.setSetupRounds);
	const setScreen = useGameStore((s) => s.setScreen);
	const startGame = useGameStore((s) => s.startGame);
	const [error, setError] = (0, import_react.useState)(null);
	const named = setupPlayers.filter((n) => n.trim()).length;
	function updateName(index, value) {
		const next = [...setupPlayers];
		next[index] = value;
		setSetupPlayers(next);
	}
	function addPlayer() {
		if (setupPlayers.length >= 100) return;
		setSetupPlayers([...setupPlayers, ""]);
	}
	function removePlayer(index) {
		if (setupPlayers.length <= 2) {
			updateName(index, "");
			return;
		}
		setSetupPlayers(setupPlayers.filter((_, i) => i !== index));
	}
	function move(index, dir) {
		const next = [...setupPlayers];
		const swap = index + dir;
		if (swap < 0 || swap >= next.length) return;
		[next[index], next[swap]] = [next[swap], next[index]];
		setSetupPlayers(next);
	}
	function onStart() {
		const message = startGame();
		setError(message);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "text-sm text-muted hover:text-fg",
						onClick: () => setScreen("home"),
						children: "Back"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display mt-3 text-title font-medium tracking-tight",
						children: "Players"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Two to one hundred. The first name rolls first, then play goes down the list. Use real dice and enter each total below."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "flex flex-col gap-2",
				children: setupPlayers.map((name, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-6 text-center text-xs tabular-nums text-faint",
							children: index + 1
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: name,
							onChange: (e) => updateName(index, e.target.value),
							placeholder: `Player ${index + 1}`,
							maxLength: 18,
							autoComplete: "off",
							"aria-label": `Player ${index + 1} name`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "rounded-sm p-2 text-muted hover:text-fg",
									onClick: () => move(index, -1),
									"aria-label": "Move up",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "rounded-sm p-2 text-muted hover:text-fg",
									onClick: () => move(index, 1),
									"aria-label": "Move down",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "rounded-sm p-2 text-muted hover:text-danger",
									onClick: () => removePlayer(index),
									"aria-label": "Remove player",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
								})
							]
						})
					]
				}, index))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				className: "mt-3 rounded-lg",
				onClick: addPlayer,
				disabled: setupPlayers.length >= 100,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Add player"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-kicker font-medium uppercase tracking-[0.18em] text-muted",
						children: "Rounds"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 grid grid-cols-3 gap-2",
						children: ROUND_OPTIONS.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSetupRounds(n),
							className: cn("h-12 rounded-md border text-sm font-medium tabular-nums transition-colors duration-150", setupRounds === n ? "border-accent bg-accent text-accent-fg" : "border-border bg-raised text-fg hover:border-accent/40"),
							children: n
						}, n))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-faint",
						children: "Most tables play 20."
					})
				]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-danger",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "xl",
				className: "mt-8 w-full rounded-lg",
				onClick: onStart,
				disabled: named < 2,
				children: "Deal them in"
			})
		]
	});
}
function ConnectedTable() {
	const snapshot = useRoomStore((s) => s.snapshot);
	const flash = useRoomStore((s) => s.flash);
	const roll = useRoomStore((s) => s.roll);
	const skip = useRoomStore((s) => s.skip);
	const undo = useRoomStore((s) => s.undo);
	const next = useRoomStore((s) => s.next);
	const bank = useRoomStore((s) => s.bank);
	const rematch = useRoomStore((s) => s.rematch);
	const backToLobby = useRoomStore((s) => s.backToLobby);
	const leave = useRoomStore((s) => s.leave);
	if (!snapshot?.game) return null;
	const api = {
		code: snapshot.code,
		game: snapshot.game,
		flash,
		canUndo: snapshot.canUndo,
		enterRoll: (sum, doubles) => void roll(sum, doubles),
		skip: () => void skip(),
		undo: () => void undo(),
		next: () => void next(),
		bank: (playerId) => void bank(playerId),
		playAgain: () => void rematch(),
		backToLobby: () => void backToLobby(),
		leave: () => void leave()
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableProvider, {
		value: api,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayScreen, {})
	});
}
function GameApp() {
	const screen = useGameStore((s) => s.screen);
	const game = useGameStore((s) => s.game);
	const hydrated = useGameStore((s) => s.hydrated);
	const setHydrated = useGameStore((s) => s.setHydrated);
	const mode = useRoomStore((s) => s.mode);
	const role = useRoomStore((s) => s.session?.role ?? null);
	const restore = useRoomStore((s) => s.restore);
	(0, import_react.useEffect)(() => {
		const finish = () => setHydrated();
		const unsub = useGameStore.persist.onFinishHydration(finish);
		if (useGameStore.persist.hasHydrated()) finish();
		return unsub;
	}, [setHydrated]);
	(0, import_react.useEffect)(() => {
		restore();
	}, [restore]);
	if (!hydrated) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-kicker font-medium uppercase tracking-[0.22em] text-muted",
			children: "Table dice game"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display mt-3 text-display font-medium leading-[0.9] tracking-[-0.04em]",
			children: "BANK"
		})]
	});
	if (mode === "join") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JoinTable, {});
	if (mode === "lobby" && role === "host") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HostLobby, {});
	if (role === "player" && (mode === "lobby" || mode === "play")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerRemote, {});
	if (mode === "play" && role === "host") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectedTable, {});
	if (screen === "setup") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetupScreen, {});
	if (screen === "how") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HowToScreen, {});
	if (screen === "history") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryScreen, {});
	if (screen === "play" && game) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayScreen, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeScreen, {});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { Home as component };
