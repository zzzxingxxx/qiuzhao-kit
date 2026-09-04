import type { Resume } from "./resume";
import { buildCompleteSampleResume } from "./sample";

export const RESUME_TEMPLATE_IDS = [
  "campus-tech",
  "campus-classic",
  "campus-sidebar",
  "campus-banner",
  "campus-timeline",
  "campus-serif",
  "campus-split",
  "campus-card",
] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];
export type ResumeLayout =
  | "tech"
  | "classic"
  | "sidebar"
  | "banner"
  | "timeline"
  | "serif"
  | "split"
  | "card";

export type ResumeTemplateCategory = "研发" | "正式" | "双栏" | "创意";

export type ResumeTemplateMeta = {
  id: ResumeTemplateId;
  name: string;
  audience: string;
  description: string;
  layout: ResumeLayout;
  color: string;
  showPhoto: boolean;
  category: ResumeTemplateCategory;
  tags: string[];
};

/** 旧 W3 单模板 id，读取时映射到技术简洁。 */
export const LEGACY_TEMPLATE_ID = "campus-onepage";

export const RESUME_TEMPLATE_CATEGORIES: ResumeTemplateCategory[] = [
  "研发",
  "正式",
  "双栏",
  "创意",
];

export const RESUME_TEMPLATES: ResumeTemplateMeta[] = [
  {
    id: "campus-tech",
    name: "技术简洁",
    audience: "互联网 / 研发",
    description:
      "单栏左对齐，主题色模块标题，ATS 友好。接近 OpenResume 的一页纸，适合后端 / 前端 / 算法校招。",
    layout: "tech",
    color: "#1f4e79",
    showPhoto: false,
    category: "研发",
    tags: ["ATS", "无照片", "一页纸"],
  },
  {
    id: "campus-classic",
    name: "正式经典",
    audience: "国企 / 银行 / 事业单位",
    description:
      "居中姓名、克制配色、证件照靠右。偏 CyC / 传统校招纸样，适合正式投递。",
    layout: "classic",
    color: "#222222",
    showPhoto: true,
    category: "正式",
    tags: ["证件照", "居中", "正式"],
  },
  {
    id: "campus-sidebar",
    name: "左侧信息栏",
    audience: "综合岗 / 需要证件照",
    description:
      "左栏放照片、联系方式和技能，右栏经历。接近猫步 / Reactive Resume 双栏。",
    layout: "sidebar",
    color: "#1f4e79",
    showPhoto: true,
    category: "双栏",
    tags: ["双栏", "证件照", "技能侧栏"],
  },
  {
    id: "campus-banner",
    name: "顶栏色块",
    audience: "产品 / 运营 / 设计相邻",
    description: "顶部色带承载姓名与联系方式，模块标题干净，一份内容即可套用。",
    layout: "banner",
    color: "#1d4ed8",
    showPhoto: false,
    category: "创意",
    tags: ["色带", "无照片", "产品运营"],
  },
  {
    id: "campus-timeline",
    name: "经历时间轴",
    audience: "研发 / 实习经历多",
    description:
      "实习、项目、校园经历用时间轴串联，层次比纯列表更清楚，仍保持一页纸密度。",
    layout: "timeline",
    color: "#0f766e",
    showPhoto: false,
    category: "研发",
    tags: ["时间轴", "ATS", "经历导向"],
  },
  {
    id: "campus-serif",
    name: "学术衬线",
    audience: "科研 / 高校 / 研究所",
    description:
      "宋体风格、居中标题、双线模块名，接近学术 CV 与高校就业中心纸样。",
    layout: "serif",
    color: "#3f3f46",
    showPhoto: true,
    category: "正式",
    tags: ["衬线", "证件照", "学术"],
  },
  {
    id: "campus-split",
    name: "左右分栏",
    audience: "综合岗 / 管培 / 需要信息密度",
    description:
      "左栏教育、技能、奖项，右栏实习与项目。接近超级简历 / 木及的信息分区。",
    layout: "split",
    color: "#1e3a5f",
    showPhoto: true,
    category: "双栏",
    tags: ["分栏", "证件照", "高密度"],
  },
  {
    id: "campus-card",
    name: "模块卡片",
    audience: "互联网产品 / 设计相邻 / 展示型",
    description:
      "每个模块独立卡片，圆角与浅底把经历切开，预览更接近现代在线简历。",
    layout: "card",
    color: "#6d28d9",
    showPhoto: false,
    category: "创意",
    tags: ["卡片", "现代", "展示"],
  },
];

export function isResumeTemplateId(id: string): id is ResumeTemplateId {
  return (RESUME_TEMPLATE_IDS as readonly string[]).includes(id);
}

export function resolveResumeTemplateId(id: string | undefined): ResumeTemplateId {
  if (id && isResumeTemplateId(id)) return id;
  if (id === LEGACY_TEMPLATE_ID) return "campus-tech";
  return "campus-tech";
}

export function getResumeTemplate(id: string | undefined): ResumeTemplateMeta {
  const resolved = resolveResumeTemplateId(id);
  return RESUME_TEMPLATES.find((item) => item.id === resolved) ?? RESUME_TEMPLATES[0];
}

export function createCompleteSampleResume(templateId: string): Resume {
  return buildCompleteSampleResume(getResumeTemplate(templateId), {
    id: `preview-${resolveResumeTemplateId(templateId)}`,
    profileId: "preview",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 0,
  });
}

/**
 * 套用完整模板：排版 + 主题 + 全模块示例。
 * 已填写的姓名 / 手机 / 邮箱 / 证件照 / 教育会保留。
 */
export function applyResumeTemplate(resume: Resume, templateId: string): Resume {
  const tpl = getResumeTemplate(templateId);
  const complete = buildCompleteSampleResume(tpl, {
    id: resume.id,
    profileId: resume.profileId,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    version: resume.version,
  });
  const keepEducation = resume.education.some((item) => item.school.trim());
  return {
    ...complete,
    basics: {
      ...complete.basics,
      name: resume.basics.name.trim() || complete.basics.name,
      phone: resume.basics.phone.trim() || complete.basics.phone,
      email: resume.basics.email.trim() || complete.basics.email,
      photo: resume.basics.photo.trim() || complete.basics.photo,
      wechat: resume.basics.wechat.trim() || complete.basics.wechat,
      github: resume.basics.github.trim() || complete.basics.github,
      website: resume.basics.website.trim() || complete.basics.website,
      location: resume.basics.location.trim() || complete.basics.location,
    },
    education: keepEducation ? resume.education : complete.education,
  };
}
