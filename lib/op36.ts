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

/**
 * Points system:
 *   Birdie (score ≤ 3)   : +2
 *   Par   (score = 4)    : +1
 *   GIR                  : +1
 *   Up & Down            : +1
 *   3-putt (putts = 3)   : −1
 *   4-putt+ (putts ≥ 4)  : −3
 *   Double bogey+ (≥ 6)  : −2
 */
export function calcTotals(holes: HoleInput[]) {
  const played = holes.filter((h) => h.score > 0);
  const totalScore = holes.reduce((s, h) => s + h.score, 0);
  const totalPutts = holes.reduce((s, h) => s + h.putts, 0);
  const girs = holes.filter((h) => h.gir).length;
  const uds = holes.filter((h) => h.ud).length;
  const birdies = played.filter((h) => h.score <= 3).length;
  const pars = played.filter((h) => h.score === 4).length;
  const threePutts = holes.filter((h) => h.putts === 3).length;
  const fourPutts = holes.filter((h) => h.putts >= 4).length;
  const doubleBogeyPlus = played.filter((h) => h.score >= 6).length;

  const points =
    birdies * 2 +
    pars * 1 +
    girs +
    uds -
    threePutts * 1 -
    fourPutts * 3 -
    doubleBogeyPlus * 2;

  return { totalScore, totalPutts, girs, uds, birdies, pars, threePutts, fourPutts, doubleBogeyPlus, points };
}
