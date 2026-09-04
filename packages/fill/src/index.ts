export type AtsKind = "beisen" | "moka" | "unknown";

/** W4 会补 URL + DOM 特征。W1 只保留契约。 */
export function detectAts(input: { href?: string; html?: string } = {}): AtsKind {
  const hay = `${input.href ?? ""} ${input.html ?? ""}`.toLowerCase();
  if (hay.includes("beisen") || hay.includes("beisencloud")) return "beisen";
  if (hay.includes("mokahr") || hay.includes("moka")) return "moka";
  return "unknown";
}
