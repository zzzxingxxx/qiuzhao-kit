import { z } from "zod";

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
  chat: "针对当前简历提问，或让助手解释某一条怎么写。",
  polish: "把实习/项目要点改得更短、有动词和数字，不编造经历。",
  star: "按情境-任务-行动-结果重写要点，数字保持原样。",
  summary: "根据已有教育与经历写 2–4 句自我评价。",
  match: "用岗位描述里的词改写要点，不添加没做过的事。",
  critique: "指出空泛、缺数字、难面试深挖、可能超一页的地方。",
  keywords: "列出 JD 关键词，对照简历里有没有覆盖。",
  interview: "根据实习和项目出 6–10 个可能被追问的问题。",
};

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
  internships?: { id: string; bullets: string[] }[];
  projects?: { id: string; bullets: string[] }[];
  campus?: { id: string; bullets: string[] }[];
};
