import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  aiChatRequestSchema,
  aiSettingsWriteSchema,
  type AiModelItem,
  type AiSettingsPublic,
} from "@qiuzhao/schema";
import { sqlite, type AiSettingsRow } from "../db/index.js";
import { nowIso } from "../lib/time.js";

export const aiRoutes = new Hono();

const SETTINGS_ID = "default";
const FETCH_MS = 45_000;

type ResolvedAi = {
  baseUrl: string;
  apiKey: string;
  model: string;
  hasDbKey: boolean;
  usingEnvKey: boolean;
};

function maskKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "****";
  return `****${trimmed.slice(-4)}`;
}

function envKey(): string {
  return (process.env.XAI_API_KEY ?? "").trim();
}

function readRow(): AiSettingsRow | undefined {
  return sqlite.prepare("SELECT * FROM ai_settings WHERE id = ?").get(SETTINGS_ID) as
    | AiSettingsRow
    | undefined;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new HTTPException(400, { message: "接口地址必须是 http(s) URL" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HTTPException(400, { message: "接口地址必须是 http(s) URL" });
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "169.254.169.254" || host === "metadata.google.internal" || host.endsWith(".internal")) {
    throw new HTTPException(400, { message: "不允许的接口地址" });
  }
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function resolveSettings(): ResolvedAi {
  const row = readRow();
  const dbKey = row?.api_key?.trim() ?? "";
  const fromEnv = envKey();
  let baseUrl = DEFAULT_AI_BASE_URL;
  if (row?.base_url) {
    try {
      baseUrl = normalizeBaseUrl(row.base_url);
    } catch {
      baseUrl = row.base_url.replace(/\/+$/, "");
    }
  }
  return {
    baseUrl,
    apiKey: dbKey || fromEnv,
    model: (row?.model || DEFAULT_AI_MODEL).trim() || DEFAULT_AI_MODEL,
    hasDbKey: Boolean(dbKey),
    usingEnvKey: !dbKey && Boolean(fromEnv),
  };
}

function publicSettings(): AiSettingsPublic {
  const resolved = resolveSettings();
  return {
    baseUrl: resolved.baseUrl,
    model: resolved.model,
    hasKey: Boolean(resolved.apiKey),
    keyHint: maskKey(resolved.apiKey),
    usingEnvKey: resolved.usingEnvKey,
    defaultBaseUrl: DEFAULT_AI_BASE_URL,
    defaultModel: DEFAULT_AI_MODEL,
    provider: DEFAULT_AI_PROVIDER,
  };
}

async function providerFetch(url: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(FETCH_MS),
  });
}

function parseModelList(payload: unknown): AiModelItem[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  const list = Array.isArray(data) ? data : Array.isArray(payload) ? payload : [];
  const items: AiModelItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const id = String((entry as { id?: unknown }).id ?? (entry as { name?: unknown }).name ?? "").trim();
    if (!id) continue;
    const ownedBy = (entry as { owned_by?: unknown }).owned_by;
    items.push({
      id,
      ownedBy: typeof ownedBy === "string" ? ownedBy : undefined,
    });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
}

function resumeBrief(resume: unknown): string {
  if (!resume || typeof resume !== "object") return "";
  try {
    const copy = JSON.parse(JSON.stringify(resume)) as { basics?: { photo?: string } };
    if (copy.basics?.photo) copy.basics.photo = "[photo]";
    return JSON.stringify(copy);
  } catch {
    return "";
  }
}

function systemPrompt(action: string, jobDesc?: string): string {
  const base =
    "你是本机「秋招网申助手」里的简历写作助手。只用简体中文。" +
    "只根据用户提供的事实改写，禁止编造公司、数字、奖项或未出现的技术。" +
    "校招一页纸：动词开头、量化结果、每条 20–40 字。";
  if (action === "polish") {
    return (
      base +
      "请润色实习和项目要点。只输出 JSON，不要 markdown：" +
      '{"summary":"可选","internships":[{"id":"原id","bullets":["..."]}],"projects":[{"id":"原id","bullets":["..."]}]}'
    );
  }
  if (action === "summary") {
    return (
      base +
      "根据简历生成 2–4 句自我评价。只输出 JSON：{\"summary\":\"...\"}"
    );
  }
  if (action === "match") {
    return (
      base +
      (jobDesc ? `岗位描述：\n${jobDesc}\n` : "") +
      "按 JD 调整要点措辞，不编造经历。只输出 JSON：" +
      '{"summary":"...","internships":[{"id":"原id","bullets":["..."]}],"projects":[{"id":"原id","bullets":["..."]}]}'
    );
  }
  return base + "普通对话用中文纯文本。用户若要求改简历，可在末尾附一段 JSON 补丁。";
}

aiRoutes.get("/settings", (c) => c.json(publicSettings()));

aiRoutes.put("/settings", async (c) => {
  const body = aiSettingsWriteSchema.parse(await c.req.json());
  const baseUrl = normalizeBaseUrl(body.baseUrl);
  const existing = readRow();
  let apiKey = existing?.api_key ?? "";
  if (body.clearKey) apiKey = "";
  else if (typeof body.apiKey === "string" && body.apiKey.trim()) apiKey = body.apiKey.trim();
  const model = body.model.trim() || DEFAULT_AI_MODEL;
  const at = nowIso();
  sqlite.prepare(
    `INSERT INTO ai_settings (id, base_url, api_key, model, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET base_url = excluded.base_url, api_key = excluded.api_key,
       model = excluded.model, updated_at = excluded.updated_at`,
  ).run(SETTINGS_ID, baseUrl, apiKey, model, at);
  return c.json(publicSettings());
});

aiRoutes.post("/models", async (c) => {
  const resolved = resolveSettings();
  if (!resolved.apiKey) {
    return c.json({ error: "ai_key_missing", message: "请先在设置里填写 API Key，或配置本机环境变量 XAI_API_KEY。" }, 400);
  }
  try {
    const res = await providerFetch(joinUrl(resolved.baseUrl, "models"), resolved.apiKey);
    const text = await res.text();
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
    if (!res.ok) {
      return c.json(
        {
          error: "ai_models_failed",
          status: res.status,
          message: typeof payload === "object" && payload && "error" in payload
            ? JSON.stringify((payload as { error: unknown }).error)
            : text.slice(0, 400),
        },
        502,
      );
    }
    return c.json({ items: parseModelList(payload), baseUrl: resolved.baseUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "models_failed";
    return c.json({ error: "ai_models_failed", message }, 502);
  }
});

aiRoutes.post("/chat", async (c) => {
  const body = aiChatRequestSchema.parse(await c.req.json());
  const resolved = resolveSettings();
  if (!resolved.apiKey) {
    return c.json({ error: "ai_key_missing", message: "请先在设置里填写 API Key，或配置本机环境变量 XAI_API_KEY。" }, 400);
  }
  const model = (body.model || resolved.model || DEFAULT_AI_MODEL).trim();
  const history = (body.messages ?? []).filter((item) => item.role !== "system");
  const userText = body.prompt?.trim();
  if (userText) history.push({ role: "user", content: userText });
  if (history.length === 0) {
    return c.json({ error: "empty_prompt", message: "请输入问题" }, 400);
  }

  const brief = resumeBrief(body.resume);
  const messages = [
    { role: "system", content: systemPrompt(body.action, body.jobDesc) },
    ...(brief
      ? [{ role: "system" as const, content: `当前简历 JSON：\n${brief.slice(0, 12000)}` }]
      : []),
    ...history,
  ];

  try {
    const res = await providerFetch(joinUrl(resolved.baseUrl, "chat/completions"), resolved.apiKey, {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        temperature: body.action === "chat" ? 0.5 : 0.3,
      }),
    });
    const text = await res.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const errObj = payload && typeof payload === "object" ? (payload as { error?: { message?: string } }).error : undefined;
      return c.json(
        {
          error: "ai_chat_failed",
          status: res.status,
          message: errObj?.message || text.slice(0, 400) || "上游接口失败",
        },
        502,
      );
    }
    const content =
      payload && typeof payload === "object"
        ? String(
            (payload as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "",
          )
        : "";
    return c.json({
      content: content.trim(),
      model,
      provider: DEFAULT_AI_PROVIDER,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "chat_failed";
    return c.json({ error: "ai_chat_failed", message }, 502);
  }
});
