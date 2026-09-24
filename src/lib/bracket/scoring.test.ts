import { describe, it, expect } from "vitest";
import { computeLeaderboard } from "./scoring";

// Minimal stand-ins for the DB row shapes computeLeaderboard reads. Only the
// fields it actually touches are provided.
type ScoringMatchup = {
  id: string;
  round: number;
  winnerBearId: string | null;
  bearAId: string | null;
  bearBId: string | null;
};
type Pick = { userId: string; matchupId: string; pickedBearId: string };
type Player = { id: string; displayName: string | null; username: string };

const player = (id: string): Player => ({ id, displayName: id, username: id });

describe("computeLeaderboard", () => {
  it("awards a decided matchup's round points only for the correct pick", () => {
    const matchups: ScoringMatchup[] = [
      { id: "r1", round: 1, winnerBearId: "A", bearAId: "A", bearBId: "B" }, // 1pt
      { id: "r3", round: 3, winnerBearId: "A", bearAId: "A", bearBId: "C" }, // 4pt
    ];
    const picks: Pick[] = [
      { userId: "u1", matchupId: "r1", pickedBearId: "A" }, // right
      { userId: "u1", matchupId: "r3", pickedBearId: "A" }, // right
      { userId: "u2", matchupId: "r1", pickedBearId: "B" }, // wrong
    ];
    const board = computeLeaderboard([player("u1"), player("u2")], matchups, picks);

    const u1 = board.find((e) => e.userId === "u1")!;
    const u2 = board.find((e) => e.userId === "u2")!;
    expect(u1.points).toBe(1 + 4);
    expect(u1.correctByRound[1]).toBe(1);
    expect(u1.correctByRound[3]).toBe(1);
    expect(u2.points).toBe(0);
  });

  it("counts undecided picks toward best-case remaining, not points", () => {
    const matchups: ScoringMatchup[] = [
      // Undecided, contestants not both known yet (a bye slot) — any pick is
      // still live, so it contributes its round value to maxRemaining.
      { id: "r2", round: 2, winnerBearId: null, bearAId: "BYE", bearBId: null },
    ];
    const picks: Pick[] = [{ userId: "u1", matchupId: "r2", pickedBearId: "BYE" }];
    const [u1] = computeLeaderboard([player("u1")], matchups, picks);

    expect(u1.points).toBe(0);
    expect(u1.maxRemaining).toBe(2);
    expect(u1.maxPossible).toBe(2);
  });

  it("stops a busted pick from accruing remaining points", () => {
    // Undecided matchup, but BOTH real contestants are known (X vs Y). A pick
    // of Z is already impossible, so it can't contribute to maxRemaining.
    const matchups: ScoringMatchup[] = [
      { id: "r2", round: 2, winnerBearId: null, bearAId: "X", bearBId: "Y" },
    ];
    const picks: Pick[] = [
      { userId: "live", matchupId: "r2", pickedBearId: "X" }, // still possible
      { userId: "bust", matchupId: "r2", pickedBearId: "Z" }, // eliminated
    ];
    const board = computeLeaderboard([player("live"), player("bust")], matchups, picks);

    expect(board.find((e) => e.userId === "live")!.maxRemaining).toBe(2);
    expect(board.find((e) => e.userId === "bust")!.maxRemaining).toBe(0);
  });

  it("drops a pick on a bear that already lost, even before the box fills", () => {
    // L lost in Round 1. The Final Four box has no real contestants yet, but a
    // pick of L there can never come true.
    const matchups: ScoringMatchup[] = [
      { id: "r1", round: 1, winnerBearId: "W", bearAId: "W", bearBId: "L" },
      { id: "r3", round: 3, winnerBearId: null, bearAId: null, bearBId: null },
    ];
    const picks: Pick[] = [
      { userId: "live", matchupId: "r3", pickedBearId: "W" },
      { userId: "bust", matchupId: "r3", pickedBearId: "L" },
    ];
    const board = computeLeaderboard([player("live"), player("bust")], matchups, picks);

    expect(board.find((e) => e.userId === "live")!.maxRemaining).toBe(4);
    expect(board.find((e) => e.userId === "bust")!.maxRemaining).toBe(0);
  });

  it("gives byes no phantom Round 1 credit (scores picks, not bears)", () => {
    // A bye bear has no Round 1 matchup row, so a player who only has Round 2+
    // picks earns nothing in Round 1 — there's simply no r1 pick to score.
    const matchups: ScoringMatchup[] = [
      { id: "r2", round: 2, winnerBearId: "BYE", bearAId: "BYE", bearBId: "W" },
    ];
    const picks: Pick[] = [{ userId: "u1", matchupId: "r2", pickedBearId: "BYE" }];
    const [u1] = computeLeaderboard([player("u1")], matchups, picks);

    expect(u1.correctByRound[1]).toBe(0);
    expect(u1.points).toBe(2);
  });

  it("sorts by points descending", () => {
    const matchups: ScoringMatchup[] = [
      { id: "r4", round: 4, winnerBearId: "A", bearAId: "A", bearBId: "B" }, // 8pt
      { id: "r1", round: 1, winnerBearId: "A", bearAId: "A", bearBId: "B" }, // 1pt
    ];
    const picks: Pick[] = [
      { userId: "leader", matchupId: "r4", pickedBearId: "A" }, // 8
      { userId: "trailer", matchupId: "r1", pickedBearId: "A" }, // 1
    ];
    const board = computeLeaderboard([player("trailer"), player("leader")], matchups, picks);

    expect(board.map((e) => e.userId)).toEqual(["leader", "trailer"]);
  });

  it("falls back to username when displayName is null", () => {
    const matchups: ScoringMatchup[] = [];
    const users: Player[] = [{ id: "u1", displayName: null, username: "grizzly" }];
    const [u1] = computeLeaderboard(users, matchups, []);
    expect(u1.displayName).toBe("grizzly");
  });
});
