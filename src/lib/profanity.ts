// Minimal block list for the jam build. Expand or replace with a library
// (e.g. bad-words) post-launch if moderation needs tighten.
const BLOCKED = [
  "fuck",
  "shit",
  "cunt",
  "bitch",
  "dick",
  "cock",
  "pussy",
  "nigg",
  "fag",
  "rape",
  "kkk",
  "nazi",
];

export function isClean(name: string): boolean {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  return !BLOCKED.some((word) => lower.includes(word));
}
