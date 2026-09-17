import { describe, it, expect } from "vitest";
import { boxGridRow, bracketHasByes, bracketTemplateRows } from "./layout";

// `grid-row: a / b` — the center of that span, in row units, so the tests can
// talk about where a box actually lands rather than about row indices.
function center(row: string): number {
  const [start, end] = row.split(" / ").map(Number);
  return (start + end) / 2;
}

describe("bracketHasByes", () => {
  it("reads the bracket shape off the Round 1 count", () => {
    expect(bracketHasByes(4)).toBe(true);
    expect(bracketHasByes(8)).toBe(false);
  });
});

describe("bracketTemplateRows", () => {
  it("is a header row plus one base row per Round 1 matchup", () => {
    expect(bracketTemplateRows(8)).toBe("auto repeat(8, minmax(128px, auto))");
    expect(bracketTemplateRows(4, 152)).toBe("auto repeat(4, minmax(152px, auto))");
  });
});

describe("boxGridRow, spread", () => {
  it("gives each Round 1 matchup its own base row, starting below the header", () => {
    expect(boxGridRow(1, 1, "spread")).toBe("2 / 3");
    expect(boxGridRow(1, 8, "spread")).toBe("9 / 10");
  });

  it("centers every box between the two that feed it", () => {
    for (const [round, position] of [
      [2, 1],
      [2, 4],
      [3, 1],
      [3, 2],
      [4, 1],
    ] as const) {
      const feederA = boxGridRow(round - 1, position * 2 - 1, "spread");
      const feederB = boxGridRow(round - 1, position * 2, "spread");
      expect(center(boxGridRow(round, position, "spread"))).toBe(
        (center(feederA) + center(feederB)) / 2
      );
    }
  });

  it("doubles the span each round, so the Championship covers all 8 base rows", () => {
    expect(boxGridRow(2, 1, "spread")).toBe("2 / 4");
    expect(boxGridRow(3, 1, "spread")).toBe("2 / 6");
    expect(boxGridRow(4, 1, "spread")).toBe("2 / 10");
  });
});

describe("boxGridRow, packed", () => {
  it("packs Round 1 and Round 2 against the top, one base row each", () => {
    expect(boxGridRow(1, 1, "packed")).toBe("2 / 3");
    expect(boxGridRow(1, 8, "packed")).toBe("9 / 10");
    expect(boxGridRow(2, 1, "packed")).toBe("2 / 3");
    expect(boxGridRow(2, 4, "packed")).toBe("5 / 6");
  });

  it("leaves Round 2 above the pair feeding it, which is what the fan connector draws", () => {
    for (const position of [1, 2, 3, 4]) {
      const box = center(boxGridRow(2, position, "packed"));
      const upperFeeder = center(boxGridRow(1, position * 2 - 1, "packed"));
      expect(box).toBeLessThanOrEqual(upperFeeder);
    }
  });

  it("still centers the Final Four and Championship on their feeders", () => {
    for (const [round, position] of [
      [3, 1],
      [3, 2],
      [4, 1],
    ] as const) {
      const feederA = boxGridRow(round - 1, position * 2 - 1, "packed");
      const feederB = boxGridRow(round - 1, position * 2, "packed");
      expect(center(boxGridRow(round, position, "packed"))).toBe(
        (center(feederA) + center(feederB)) / 2
      );
    }
  });

  it("keeps the Final Four and Championship within Round 2's four rows", () => {
    // Round 2 ends at row 6, so nothing downstream may reach past it — that
    // containment is what makes the packed layout short enough to read.
    for (const row of [boxGridRow(3, 1, "packed"), boxGridRow(3, 2, "packed"), boxGridRow(4, 1, "packed")]) {
      expect(Number(row.split(" / ")[1])).toBeLessThanOrEqual(6);
    }
  });
});
