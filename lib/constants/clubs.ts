/** 球杆代码 */
export const CLUB_CODES = [
  "D", "3W", "5W", "7W", "3H", "4H", "5H",
  "4i", "5i", "6i", "7i", "8i", "9i",
  "PW", "SW", "LW", "50", "52", "54", "56", "58", "60",
  "Putter",
] as const;

export type ClubCode = (typeof CLUB_CODES)[number];

/** 开球结果 */
export const TEE_RESULTS = ["FW", "L", "R", "PEN"] as const;
export type TeeResult = (typeof TEE_RESULTS)[number];

/** 障碍方向 */
export const HAZARD_SIDES = ["L", "R", "C"] as const;
export type HazardSide = (typeof HAZARD_SIDES)[number];

/** 障碍类型 */
export const HAZARD_TYPES = ["water", "bunker", "trees", "OOB"] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];
