import type {
  AiChatAction,
  AiModelItem,
  AiSettingsPublic,
  Application,
  Profile,
  Resume,
  ResumeSectionKey,
} from "@qiuzhao/schema";

const BASE = "/api";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `${res.status} ${text}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = json.message || json.error || message;
    } catch {
      /* keep */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export type Health = { ok: boolean; service: string; db: string; time: string };

export function getHealth() {
  return request<Health>("/health");
}

export function listProfiles() {
  return request<{ items: Profile[] }>("/profiles");
}

/** Prefer a named/contact profile so a leftover empty row is not treated as the workspace. */
export function pickPrimaryProfile(items: Profile[]): Profile | null {
  if (!items.length) return null;
  return (
    items.find((item) => item.name.trim()) ??
    items.find((item) => item.phone.trim() || item.email.trim()) ??
    items[0]
  );
}

export function listResumes(profileId?: string) {
  const q = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
  return request<{ items: Resume[] }>(`/resumes${q}`);
}

export function listApplications() {
  return request<{ items: Application[] }>("/applications");
}

export function getAiSettings() {
  return request<AiSettingsPublic>("/ai/settings");
}

export function saveAiSettings(body: {
  baseUrl: string;
  apiKey?: string;
  model: string;
  clearKey?: boolean;
}) {
  return request<AiSettingsPublic>("/ai/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function fetchAiModels() {
  return request<{ items: AiModelItem[]; baseUrl: string }>("/ai/models", {
    method: "POST",
    body: "{}",
  });
}

export type ExtensionStatus = {
  ok: boolean;
  browser: { name: string; path: string } | null;
  extensionDir: string;
  built: boolean;
  profileDir: string;
};

export type ExtensionLaunchResult = {
  ok: boolean;
  browser: string;
  url: string;
  rebuilt: boolean;
  extensionDir: string;
};

export function getExtensionStatus() {
  return request<ExtensionStatus>("/extension/status");
}

export function launchExtensionBrowser(body?: { url?: string }) {
  return request<ExtensionLaunchResult>("/extension/launch", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export function chatAi(body: {
  messages?: { role: "user" | "assistant" | "system"; content: string }[];
  prompt?: string;
  action?: AiChatAction;
  jobDesc?: string;
  resume?: unknown;
  sections?: ResumeSectionKey[];
  model?: string;
}) {
  return request<{ content: string; model: string; provider: string }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
