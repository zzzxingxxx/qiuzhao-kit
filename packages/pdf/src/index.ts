export const CAMPUS_ONEPAGE_TEMPLATE_ID = "campus-tech" as const;

/** A4 in CSS millimeters. Padding chosen for typical 校招 uploads. */
export const PAPER = {
  widthMm: 210,
  heightMm: 297,
  paddingMm: 14,
} as const;

export function resumeFileName(name: string, role: string, version: number): string {
  const safe = (name || "未命名").replace(/[\\/:*?"<>|]/g, "");
  return `${safe}-${role || "校招"}-v${version}.pdf`;
}

export const CAMPUS_ONEPAGE_CSS = `
.paper {
  width: ${PAPER.widthMm}mm;
  height: ${PAPER.heightMm}mm;
  padding: ${PAPER.paddingMm}mm;
  box-sizing: border-box;
  background: #fff;
  color: #222;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 10.5pt;
  line-height: 1.42;
  overflow: hidden;
}
`;
