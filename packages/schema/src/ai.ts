import { z } from "zod";
import { RESUME_SECTION_KEYS, RESUME_SECTION_LABELS, type ResumeSectionKey } from "./resume";

/** SpaceXAI（xAI）默认接入点。密钥只放本机服务端。 */
export const DEFAULT_AI_PROVIDER = "SpaceXAI";
export const DEFAULT_AI_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_AI_MODEL = "grok-4.5";

export const AI_CHAT_ACTIONS = [
  "chat",
  "polish",
  "star",
  "summary",
  "match",
  "critique",
  "keywords",
  "interview",
] as const;
export type AiChatAction = (typeof AI_CHAT_ACTIONS)[number];

export const AI_ACTION_LABELS: Record<AiChatAction, string> = {
  chat: "自由提问",
  polish: "润色要点",
  star: "STAR 改写",
  summary: "写自我评价",
  match: "按 JD 改写",
  critique: "诊断这份简历",
  keywords: "对照 JD 关键词",
  interview: "模拟面试追问",
};

export const AI_ACTION_HINTS: Record<AiChatAction, string> = {
  chat: "针对当前勾选的模块提问，或让助手解释某一条怎么写。",
  polish: "只改勾选模块：更短、有动词和数字，不编造经历。",
  star: "按情境-任务-行动-结果重写勾选的实习/项目/校园要点。",
  summary: "根据已有教育与经历写 2–4 句自我评价。",
  match: "用岗位描述里的词改写勾选模块，不添加没做过的事。",
  critique: "按勾选模块指出空泛、缺数字、难面试深挖、可能超一页的地方。",
  keywords: "列出 JD 关键词，对照勾选模块里有没有覆盖。",
  interview: "根据勾选的实习和项目出 6–10 个可能被追问的问题。",
};

/** STAR 改写只适用于经历类模块。 */
export const AI_STAR_SECTION_KEYS = ["internships", "projects", "campus"] as const;
export type AiStarSectionKey = (typeof AI_STAR_SECTION_KEYS)[number];

export const aiSettingsWriteSchema = z.object({
  baseUrl: z.string().trim().min(1).max(500),
  apiKey: z.string().max(800).optional(),
  model: z.string().trim().max(200).default(""),
  clearKey: z.boolean().optional(),
});

export const aiChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().max(16000),
});

export const aiChatRequestSchema = z.object({
  messages: z.array(aiChatMessageSchema).max(40).optional(),
  prompt: z.string().max(8000).optional(),
  action: z.enum(AI_CHAT_ACTIONS).default("chat"),
  jobDesc: z.string().max(8000).optional(),
  resume: z.unknown().optional(),
  sections: z.array(z.enum(RESUME_SECTION_KEYS)).max(7).optional(),
  model: z.string().max(200).optional(),
});

export type AiSettingsWrite = z.infer<typeof aiSettingsWriteSchema>;
export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;

export type AiSettingsPublic = {
  baseUrl: string;
  model: string;
  hasKey: boolean;
  keyHint: string;
  usingEnvKey: boolean;
  defaultBaseUrl: string;
  defaultModel: string;
  provider: string;
};

export type AiModelItem = {
  id: string;
  ownedBy?: string;
};

export type AiPatch = {
  summary?: string;
  education?: { id: string; detail: string }[];
  internships?: { id: string; bullets: string[] }[];
  projects?: { id: string; bullets: string[] }[];
  campus?: { id: string; bullets: string[] }[];
  skillGroups?: { id: string; items: string }[];
  awards?: string[];
};

export function resolveAiSections(
  action: AiChatAction,
  sections?: ResumeSectionKey[],
): ResumeSectionKey[] {
  if (action === "summary") return ["summary"];
  const picked = (sections ?? []).filter((key) =>
    (RESUME_SECTION_KEYS as readonly string[]).includes(key),
  );
  if (action === "star") {
    return picked.filter((key): key is AiStarSectionKey =>
      (AI_STAR_SECTION_KEYS as readonly string[]).includes(key),
    );
  }
  return picked;
}

export function clipAiPatch(patch: AiPatch, sections?: ResumeSectionKey[]): AiPatch {
  const allow = new Set(sections?.length ? sections : RESUME_SECTION_KEYS);
  const next: AiPatch = {};
  if (allow.has("summary") && patch.summary?.trim()) next.summary = patch.summary.trim();
  if (allow.has("education") && patch.education?.length) next.education = patch.education;
  if (allow.has("internships") && patch.internships?.length) next.internships = patch.internships;
  if (allow.has("projects") && patch.projects?.length) next.projects = patch.projects;
  if (allow.has("campus") && patch.campus?.length) next.campus = patch.campus;
  if (allow.has("skills") && patch.skillGroups?.length) next.skillGroups = patch.skillGroups;
  if (allow.has("awards") && patch.awards?.length) next.awards = patch.awards;
  return next;
}

export function aiPatchHasContent(patch: AiPatch): boolean {
  return Boolean(
    patch.summary?.trim() ||
      patch.education?.length ||
      patch.internships?.length ||
      patch.projects?.length ||
      patch.campus?.length ||
      patch.skillGroups?.length ||
      patch.awards?.length,
  );
}

export function aiSectionLabels(sections: ResumeSectionKey[]): string {
  return sections.map((key) => RESUME_SECTION_LABELS[key]).join("、");
}
