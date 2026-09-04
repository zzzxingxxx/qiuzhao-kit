export const CAMPUS_ONEPAGE_TEMPLATE_ID = "campus-onepage" as const;

export function resumeFileName(name: string, role: string, version: number): string {
  const safe = (name || "未命名").replace(/[\\/:*?"<>|]/g, "");
  return `${safe}-${role || "校招"}-v${version}.pdf`;
}
