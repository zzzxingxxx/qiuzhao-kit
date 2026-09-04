export type AtsKind = "beisen" | "moka" | "unknown";

/** 只作备注，不作为能不能预填的门槛。 */
export function detectAts(input: { href?: string; html?: string } = {}): AtsKind {
  const hay = `${input.href ?? ""} ${input.html ?? ""}`.toLowerCase();
  if (hay.includes("beisen") || hay.includes("beisencloud")) return "beisen";
  if (hay.includes("mokahr") || hay.includes("moka")) return "moka";
  return "unknown";
}
