export const COURSES = [
  "BSIT",
  "BSBA-FM",
  "BSBA-MM",
  "BSBA-HRM",
  "BSC",
  "BEED",
  "BSED-ENG",
  "BSED-SS",
  "BSED-VE",
  "BSTM",
] as const;

export type Course = (typeof COURSES)[number];
