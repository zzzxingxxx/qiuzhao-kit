import type { Resume } from "./resume";
import { buildCompleteSampleResume } from "./sample";

export const RESUME_TEMPLATE_IDS = [
  "campus-tech",
  "campus-classic",
  "campus-sidebar",
  "campus-banner",
] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];
export type ResumeLayout = "tech" | "classic" | "sidebar" | "banner";

export type ResumeTemplateMeta = {
  id: ResumeTemplateId;
  name: string;
  audience: string;
  description: string;
  layout: ResumeLayout;
  color: string;
  showPhoto: boolean;
};

/** 旧 W3 单模板 id，读取时映射到技术简洁。 */
export const LEGACY_TEMPLATE_ID = "campus-onepage";

export const RESUME_TEMPLATES: ResumeTemplateMeta[] = [
  {
    id: "campus-tech",
    name: "技术简洁",
    audience: "互联网 / 研发",
    description: "单栏左对齐，主题色模块标题，ATS 友好，接近 OpenResume 的一页纸。",
    layout: "tech",
    color: "#1f4e79",
    showPhoto: false,
  },
  {
    id: "campus-classic",
    name: "正式经典",
    audience: "国企 / 银行 / 事业单位",
    description: "居中姓名、克制配色，偏 CyC / 传统校招纸样，适合正式投递。",
    layout: "classic",
    color: "#222222",
    showPhoto: true,
  },
  {
    id: "campus-sidebar",
    name: "左侧信息栏",
    audience: "综合岗 / 需要证件照",
    description: "左栏放照片、联系方式和技能，右栏经历，接近猫步 / Reactive Resume 双栏。",
    layout: "sidebar",
    color: "#1f4e79",
    showPhoto: true,
  },
  {
    id: "campus-banner",
    name: "顶栏色块",
    audience: "产品 / 运营 / 设计相邻",
    description: "顶部色带承载姓名与联系方式，模块标题干净，一份内容即可套用。",
    layout: "banner",
    color: "#1d4ed8",
    showPhoto: false,
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
