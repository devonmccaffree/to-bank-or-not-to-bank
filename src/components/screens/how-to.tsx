import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";

const STEPS = [
  {
    title: "Object",
    body: "Be the player who banks the most points after 10, 15, or 20 rounds. Most tables play 20.",
  },
  {
    title: "Setup",
    body: "Add every name. Choose a scorekeeper — the banker — to run this screen. Each turn uses two dice, shared or one pair each.",
  },
  {
    title: "Rolling",
    body: "Play clockwise. On a turn, roll both dice and enter the total on the pad. That number is added to the shared BANK.",
  },
  {
    title: "The first three",
    body: "The first three rolls of every round are safe. A seven is worth 70 and does not end the round. Doubles in these rolls do not double the bank — two fives add 10.",
  },
  {
    title: "After that",
    body: "Starting with the fourth roll, a seven busts the bank and ends the round. Press a number to add it. Press Doubles — or 2 or 12 — to double the whole BANK. The first three rolls never double.",
  },
  {
    title: "Banking",
    body: "When someone calls BANK, tap their name on the scoreboard. They take the current pot into their personal score — once per round — then sit out until the next round. There is no limit to how many people bank the same pot. Players who never bank that round score nothing from it.",
  },
  {
    title: "Ending a round",
    body: "A round ends when a seven is rolled after the safe three, or when every player has banked. Then the pot resets and everyone can roll and bank again.",
  },
];

export function HowToScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12 pt-8">
      <button
        type="button"
        className="self-start text-sm text-muted hover:text-fg"
        onClick={() => setScreen(game ? "play" : "home")}
      >
        Back
      </button>
      <h1 className="font-display mt-3 text-title font-medium tracking-tight">How to play</h1>
      <p className="mt-2 text-sm text-muted">
        Quick, loud, and made for a table of two or a hundred.
      </p>
      <ol className="mt-8 space-y-6">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <p className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 font-medium text-fg">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        House notes from the original table: only the roller calls the number on the dice, and
        saying the word BANK — even by accident — banks you out of the round.
      </div>
      <Button
        size="lg"
        className="mt-8 w-full rounded-lg"
        onClick={() => setScreen(game ? "play" : "setup")}
      >
        {game ? "Back to the table" : "Set up a game"}
      </Button>
    </main>
  );
}
