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
    name: "互联网研发",
    audience: "后端开发校招",
    description:
      "单栏 ATS 一页纸。范文：星海科技 / 澄数据两段后端实习，P99、QPS、覆盖率都有数；项目是网申助手与分布式评测。",
    layout: "tech",
    color: "#1f4e79",
    showPhoto: false,
    category: "研发",
    tags: ["ATS", "后端范文", "无照片"],
  },
  {
    id: "campus-classic",
    name: "国企银行",
    audience: "管培 / 对公 / 事业单位",
    description:
      "居中姓名、证件照靠右。范文：青禾银行拜访纪要与华津集团宣讲执行，不堆技术名词。",
    layout: "classic",
    color: "#1a1a1a",
    showPhoto: true,
    category: "正式",
    tags: ["证件照", "管培范文", "正式"],
  },
  {
    id: "campus-sidebar",
    name: "左侧信息栏",
    audience: "前端开发校招",
    description:
      "左栏照片、联系方式、技能。范文：澜图网络列表 LCP、木白出行小程序完成率，适合要证件照的互联网投递。",
    layout: "sidebar",
    color: "#163a5f",
    showPhoto: true,
    category: "双栏",
    tags: ["双栏", "前端范文", "证件照"],
  },
  {
    id: "campus-banner",
    name: "产品色带",
    audience: "产品经理校招",
    description:
      "顶部色带放姓名。范文：云栖互娱留存/转化、青禾教育访谈与批改队列，PRD 与 A/B 写在要点里。",
    layout: "banner",
    color: "#1d4ed8",
    showPhoto: false,
    category: "创意",
    tags: ["产品范文", "色带", "无照片"],
  },
  {
    id: "campus-timeline",
    name: "研发时间轴",
    audience: "算法工程师校招",
    description:
      "经历用时间轴串起来。范文：推荐 CTR +4.2%、检测 mAP 与 TensorRT，和「互联网研发」不是同一套字。",
    layout: "timeline",
    color: "#0f766e",
    showPhoto: false,
    category: "研发",
    tags: ["时间轴", "算法范文", "ATS"],
  },
  {
    id: "campus-serif",
    name: "学术正式",
    audience: "审计 / 事务所 / 研究所风格",
    description:
      "衬线居中、双线模块名。范文：年审监盘与函证、内审抽样，CPA 科目与底稿，适合打印后投递。",
    layout: "serif",
    color: "#3f3f46",
    showPhoto: true,
    category: "正式",
    tags: ["衬线", "证件照", "审计范文"],
  },
  {
    id: "campus-split",
    name: "左右分栏",
    audience: "数据分析校招",
    description:
      "左栏教育技能奖项，右栏实习项目。范文：投放 ROI 看板、门店促销复盘、消费异常检测。",
    layout: "split",
    color: "#1e3a5f",
    showPhoto: true,
    category: "双栏",
    tags: ["分栏", "数据分析范文", "证件照"],
  },
  {
    id: "campus-card",
    name: "模块卡片",
    audience: "用户运营校招",
    description:
      "模块做成卡片。范文：礼包核销与留存、暑假试听获客、二手社群 1800 人，和产品经理范文分开。",
    layout: "card",
    color: "#5b21b6",
    showPhoto: false,
    category: "创意",
    tags: ["运营范文", "卡片", "现代"],
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
