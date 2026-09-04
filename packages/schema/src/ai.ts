import { z } from "zod";

/** SpaceXAI（xAI）默认接入点。密钥只放本机服务端。 */
export const DEFAULT_AI_PROVIDER = "SpaceXAI";
export const DEFAULT_AI_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_AI_MODEL = "grok-4.5";

export const AI_CHAT_ACTIONS = ["chat", "polish", "summary", "match"] as const;
export type AiChatAction = (typeof AI_CHAT_ACTIONS)[number];

export const AI_ACTION_LABELS: Record<AiChatAction, string> = {
  chat: "自由提问",
  polish: "润色要点",
  summary: "生成评价",
  match: "按 JD 改写",
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
};
