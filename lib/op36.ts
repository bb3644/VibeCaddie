/** Shared Op36 constants — safe to import in both client and server code */

export const LEVEL_DISTANCES: Record<number, string> = {
  1: "25 yards",
  2: "50 yards",
  3: "75 yards",
  4: "100 yards",
  5: "110 yards",
  6: "120 yards",
  7: "130 yards",
  8: "140 yards",
  9: "150 yards",
  10: "160 yards",
};

export const MAX_LEVEL = 10;
export const PAR_PER_HOLE = 4;
export const PASS_MARK_9 = 36;
export const PASS_MARK_18 = 72;

export interface HoleInput {
  score: number;
  putts: number;
  gir: boolean;
  ud: boolean;
}

/** Calculate live display totals from hole inputs (client-safe, display only). */
export function calcTotals(holes: HoleInput[]) {
  const totalScore = holes.reduce((s, h) => s + h.score, 0);
  const totalPutts = holes.reduce((s, h) => s + h.putts, 0);
  const girs = holes.filter((h) => h.gir).length;
  const uds = holes.filter((h) => h.ud).length;
  const birdies = holes.filter((h) => h.score > 0 && h.score < PAR_PER_HOLE).length;
  const threePutts = holes.filter((h) => h.putts >= 3).length;
  const points = girs + uds + birdies * 2 - threePutts;
  return { totalScore, totalPutts, girs, uds, birdies, threePutts, points };
}
