import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  compactArchive,
  detectAts,
  heuristicMap,
  mergeFillPlans,
  planFromModelJson,
} from "@qiuzhao/fill";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  RESUME_SECTION_KEYS,
  aiChatRequestSchema,
  aiSectionLabels,
  aiSettingsWriteSchema,
  mapFormRequestSchema,
  normalizeResume,
  profileSchema,
  resumeSchema,
  resolveAiSections,
  type AiChatAction,
  type AiModelItem,
  type AiSettingsPublic,
  type Profile,
  type Resume,
  type ResumeSectionKey,
} from "@qiuzhao/schema";
import { sqlite, type AiSettingsRow, type ProfileRow, type ResumeRow } from "../db/index.js";
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

function resumeBrief(resume: unknown, sections?: ResumeSectionKey[]): string {
  if (!resume || typeof resume !== "object") return "";
  try {
    const copy = JSON.parse(JSON.stringify(resume)) as Record<string, unknown>;
    const basics = copy.basics;
    if (basics && typeof basics === "object") {
      (basics as { photo?: string }).photo = "[photo]";
    }
    if (sections?.length) {
      const keep = new Set<string>(["id", "profileId", "templateId", "targetRole", "basics", "sections", ...sections]);
      if (sections.includes("skills")) keep.add("skillGroups");
      for (const key of Object.keys(copy)) {
        if (!keep.has(key)) delete copy[key];
      }
    }
    return JSON.stringify(copy);
  } catch {
    return "";
  }
}

function patchJsonFor(sections: ResumeSectionKey[]): string {
  const keys = sections.length ? sections : [...RESUME_SECTION_KEYS];
  const chunks: string[] = [];
  if (keys.includes("summary")) chunks.push('"summary":"可选"');
  if (keys.includes("education")) chunks.push('"education":[{"id":"原id","detail":"..."}]');
  if (keys.includes("internships")) chunks.push('"internships":[{"id":"原id","bullets":["..."]}]');
  if (keys.includes("projects")) chunks.push('"projects":[{"id":"原id","bullets":["..."]}]');
  if (keys.includes("campus")) chunks.push('"campus":[{"id":"原id","bullets":["..."]}]');
  if (keys.includes("skills")) chunks.push('"skillGroups":[{"id":"原id","items":"..."}]');
  if (keys.includes("awards")) chunks.push('"awards":["..."]');
  return `{${chunks.join(",")}}`;
}

function scopeRule(sections: ResumeSectionKey[]): string {
  if (!sections.length) return "";
  return (
    `本次只处理这些模块：${aiSectionLabels(sections)}。JSON 里不要出现其他模块。` +
    "教育背景只改 detail（课程/GPA 表述），不要改学校、专业、学历和时间。" +
    "专业技能只改 skillGroups 的 items，保留原 id 和 label。" +
    "荣誉奖项只润色已有条目措辞，不得新增或编造。"
  );
}

function systemPrompt(action: AiChatAction, jobDesc?: string, sections?: ResumeSectionKey[]): string {
  const base =
    "你是本机「秋招网申助手」里的简历写作助手。只用简体中文。" +
    "只根据用户提供的事实改写，禁止编造公司、数字、奖项或未出现的技术。" +
    "校招一页纸：动词开头、量化结果、每条大约 20–40 字。";
  const keys = resolveAiSections(action, sections);
  const scope = scopeRule(keys);
  const shape = patchJsonFor(keys);
  const jd = jobDesc?.trim() ? `\n岗位描述：\n${jobDesc.trim()}\n` : "";
  const focus = keys.length ? `重点看：${aiSectionLabels(keys)}。` : "";
  if (action === "polish") {
    return base + scope + "润色勾选模块，保留原 id。只输出 JSON，不要 markdown：" + shape;
  }
  if (action === "star") {
    return (
      base +
      scope +
      "用 STAR（情境-任务-行动-结果）重写勾选的实习/项目/校园要点，数字必须来自原文。只输出 JSON：" +
      shape
    );
  }
  if (action === "summary") {
    return base + "根据简历生成 2–4 句自我评价。只输出 JSON：{\"summary\":\"...\"}";
  }
  if (action === "match") {
    return base + jd + scope + "按 JD 的用词改写勾选模块，不添加没做过的事。只输出 JSON：" + shape;
  }
  if (action === "critique") {
    return (
      base +
      focus +
      "诊断这份校招简历。用中文纯文本，分三块：" +
      "1) 一句话总评；2) 具体问题（空泛、缺数字、时间线、超一页风险），每条点到模块名；3) 优先改的 3 件事。" +
      "不要输出 JSON，不要编造经历。"
    );
  }
  if (action === "keywords") {
    return (
      base +
      jd +
      focus +
      "从岗位描述提取关键词，对照勾选模块。用中文纯文本列出：" +
      "已覆盖的词、简历里没有但 JD 要求的词、不建议硬凑的词。" +
      "没有 JD 时请说明需要粘贴岗位描述。不要输出 JSON。"
    );
  }
  if (action === "interview") {
    return (
      base +
      focus +
      "根据勾选模块出 6–10 个面试追问。每问一行：先写会问什么，再写面试官想验证什么。" +
      "不要替候选人编答案。不要输出 JSON。"
    );
  }
  return base + scope + "普通对话用中文纯文本。若用户要求改简历，可在末尾附一段 JSON 补丁：" + shape;
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

  const targetSections = resolveAiSections(body.action, body.sections);
  const brief = resumeBrief(body.resume, targetSections.length ? targetSections : undefined);
  const messages = [
    { role: "system", content: systemPrompt(body.action, body.jobDesc, body.sections) },
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

const MAP_FORM_PROMPT =
  "你是本机「秋招网申助手」的填表对照器。只用简体中文思考，最终只输出 JSON，不要 markdown。" +
  "把表单字段对到档案 / 简历里已有的事实。" +
  "禁止编造公司、数字、证书、联系人；档案没有就 value 留空，skipReason 写「档案里没有」。" +
  "姓名、性别、证件、手机、邮箱、政治面貌、城市、学校、专业、学历、GPA 只来自 profile，不要用简历覆盖。" +
  "实习、项目、技能、自我评价来自 resume。" +
  "到岗、期望城市、薪资、英语四级等来自 profile 字段或 qa。" +
  "不填密码、验证码、登录用户名。" +
  "下拉和单选的 value 必须是 options 里的原文。" +
  "confidence：能直接对上为 high，吃不准就 low 并留空。" +
  "source 写成 profile.name / profile.education.school / resume.summary / qa.cet4 这种路径。";

function pickPrimaryProfile(items: Profile[]): Profile | null {
  if (!items.length) return null;
  return (
    items.find((item) => item.name.trim()) ??
    items.find((item) => item.phone.trim() || item.email.trim()) ??
    items[0]
  );
}

function loadProfile(id?: string): Profile | null {
  if (id) {
    const row = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
    return row ? profileSchema.parse(JSON.parse(row.payload)) : null;
  }
  const rows = sqlite.prepare("SELECT * FROM profiles ORDER BY updated_at DESC").all() as ProfileRow[];
  return pickPrimaryProfile(rows.map((row) => profileSchema.parse(JSON.parse(row.payload))));
}

function loadResume(id: string | undefined, profileId: string): Resume | null {
  if (id) {
    const row = sqlite.prepare("SELECT * FROM resumes WHERE id = ?").get(id) as ResumeRow | undefined;
    return row ? normalizeResume(resumeSchema.parse(JSON.parse(row.payload))) : null;
  }
  const owned = sqlite
    .prepare("SELECT * FROM resumes WHERE profile_id = ? ORDER BY updated_at DESC")
    .all(profileId) as ResumeRow[];
  const row =
    owned[0] ??
    (sqlite.prepare("SELECT * FROM resumes ORDER BY updated_at DESC").get() as ResumeRow | undefined);
  return row ? normalizeResume(resumeSchema.parse(JSON.parse(row.payload))) : null;
}

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

aiRoutes.post("/map-form", async (c) => {
  const body = mapFormRequestSchema.parse(await c.req.json());
  const profile = loadProfile(body.profileId);
  if (!profile) {
    return c.json({ error: "profile_missing", message: "请先在网页填写档案（姓名 / 手机 / 邮箱）。" }, 400);
  }
  const resume = loadResume(body.resumeId, profile.id);
  const ctx = { profile, resume };
  const ats = detectAts({ href: body.pageUrl ?? "" });
  const heuristic = heuristicMap(body.fields, ctx);
  heuristic.atsNote = ats === "unknown" ? undefined : ats;
  heuristic.profileName = profile.name;
  heuristic.resumeRole = resume?.targetRole;

  const resolved = resolveSettings();
  if (!resolved.apiKey) {
    heuristic.usedAi = false;
    heuristic.needsKey = true;
    heuristic.warning = "未配置 API Key，仅用标签规则对照。打开网页「设置」填写后，复杂题会更准。";
    return c.json(heuristic);
  }

  try {
    const model = resolved.model;
    const brief = JSON.stringify(compactArchive(ctx)).slice(0, 14000);
    const fieldsJson = JSON.stringify(
      body.fields.map((field) => ({
        id: field.id,
        label: field.label,
        name: field.name,
        type: field.type,
        required: field.required,
        options: field.options.slice(0, 30),
        placeholder: field.placeholder,
      })),
    ).slice(0, 8000);
    const hintJson = JSON.stringify(
      heuristic.fields.map((field) => ({
        id: field.id,
        value: field.value,
        source: field.source,
        confidence: field.confidence,
        skipReason: field.skipReason,
      })),
    ).slice(0, 4000);
    const res = await providerFetch(joinUrl(resolved.baseUrl, "chat/completions"), resolved.apiKey, {
      method: "POST",
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: MAP_FORM_PROMPT },
          {
            role: "user",
            content:
              `页面：${body.pageTitle ?? ""} ${body.pageUrl ?? ""}\n` +
              `档案与简历 JSON：\n${brief}\n` +
              `表单骨架：\n${fieldsJson}\n` +
              `规则对照（身份和教育以档案为准）：\n${hintJson}\n` +
              `只输出 JSON：{"fields":[{"id":"","value":"","source":"","confidence":"high|medium|low","skipReason":"可选"}]}`,
          },
        ],
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
      heuristic.usedAi = false;
      heuristic.warning = "AI 对照失败，已退回标签规则。";
      return c.json(heuristic);
    }
    const content =
      payload && typeof payload === "object"
        ? String(
            (payload as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "",
          )
        : "";
    const parsed = extractJsonObject(content);
    if (!parsed) {
      heuristic.usedAi = false;
      heuristic.warning = "AI 未返回对照表，已退回标签规则。";
      return c.json(heuristic);
    }
    const aiPlan = planFromModelJson(parsed, body.fields, ctx);
    const merged = mergeFillPlans(body.fields, heuristic, aiPlan);
    merged.usedAi = true;
    merged.needsKey = false;
    merged.atsNote = heuristic.atsNote;
    merged.profileName = profile.name;
    merged.resumeRole = resume?.targetRole;
    return c.json(merged);
  } catch (error) {
    heuristic.usedAi = false;
    heuristic.warning = error instanceof Error ? `AI 对照失败：${error.message}` : "AI 对照失败，已退回标签规则。";
    return c.json(heuristic);
  }
});
