import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "draft",
  "filled",
  "submitted",
  "written",
  "interview",
  "offer",
  "rejected",
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const atsSchema = z.enum(["beisen", "moka", "other"]);
export type Ats = z.infer<typeof atsSchema>;

export const STATUS_FLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["filled", "rejected"],
  filled: ["submitted", "draft", "rejected"],
  submitted: ["written", "interview", "rejected"],
  written: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: [],
  rejected: ["draft"],
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "待投",
  filled: "已预填",
  submitted: "已投",
  written: "笔试",
  interview: "面试",
  offer: "Offer",
  rejected: "挂",
};

export const BOARD_COLUMNS: { key: ApplicationStatus; name: string }[] = [
  { key: "draft", name: "待投" },
  { key: "filled", name: "已预填" },
  { key: "submitted", name: "已投" },
  { key: "written", name: "笔试" },
  { key: "interview", name: "面试" },
  { key: "offer", name: "Offer" },
  { key: "rejected", name: "挂" },
];

export const applicationSchema = z.object({
  id: z.string(),
  company: z.string().default(""),
  jobTitle: z.string().default(""),
  ats: atsSchema.default("other"),
  applyUrl: z.string().default(""),
  status: applicationStatusSchema.default("draft"),
  resumeVersion: z.number().int().nonnegative().nullable().default(null),
  filledAt: z.string().nullable().default(null),
  submittedAt: z.string().nullable().default(null),
  notes: z.string().default(""),
  missingFields: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Application = z.infer<typeof applicationSchema>;

export const applicationWriteSchema = applicationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type ApplicationWrite = z.infer<typeof applicationWriteSchema>;

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return true;
  return STATUS_FLOW[from].includes(to);
}

export const applicationFromFillSchema = z.object({
  pageUrl: z.string().min(1).max(2000),
  pageTitle: z.string().max(300).optional(),
  company: z.string().max(80).optional(),
  jobTitle: z.string().max(80).optional(),
  missingFields: z.array(z.string().max(200)).max(120).optional(),
  resumeVersion: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(2000).optional(),
  ats: atsSchema.optional(),
});

export type ApplicationFromFill = z.infer<typeof applicationFromFillSchema>;

const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "from", "spm"];
const HOST_SKIP = new Set([
  "www",
  "jobs",
  "job",
  "careers",
  "career",
  "campus",
  "zhaopin",
  "apply",
  "boards",
  "greenhouse",
  "lever",
  "myworkdayjobs",
  "workday",
  "ashbyhq",
  "com",
  "cn",
  "io",
  "net",
  "org",
  "co",
  "edu",
  "m",
]);

export function normalizeApplyUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    for (const key of TRACKING_PARAMS) url.searchParams.delete(key);
    return url.toString().slice(0, 2000);
  } catch {
    return raw.trim().slice(0, 2000);
  }
}

function prettyBrand(raw: string): string {
  if (!raw) return "";
  if (/^[a-z0-9-]+$/i.test(raw)) {
    return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return raw;
}

export function guessApplyMeta(pageUrl = "", pageTitle = ""): { company: string; jobTitle: string } {
  let company = "";
  let jobTitle = "";
  const title = pageTitle.replace(/\s+/g, " ").trim();
  const noise = /招聘|申请|网申|投递|校园|校招|职位|岗位|careers?|jobs?|apply|application|hiring/i;

  if (title) {
    const parts = title.split(/\s*[-|–—·_/]\s*/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      if (noise.test(last) && !noise.test(first)) {
        company = first;
        jobTitle = parts.slice(1).filter((part) => !noise.test(part)).join(" · ") || last;
      } else if (!noise.test(last) && last.length <= 24) {
        company = last;
        jobTitle = parts.slice(0, -1).filter((part) => !noise.test(part)).join(" · ") || first;
      } else {
        jobTitle = title;
      }
    } else {
      jobTitle = title.replace(noise, "").trim() || title;
    }
  }

  if (pageUrl) {
    try {
      const url = new URL(pageUrl);
      const host = url.hostname.toLowerCase();
      if (/^(localhost|127\.|0\.0\.0\.0)/.test(host)) {
        if (!company) company = "本地演示";
      } else if (!company) {
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (host.includes("greenhouse.io")) {
          const slug = pathParts[0] === "embed" ? pathParts[1] : pathParts[0];
          if (slug && slug !== "jobs") company = slug;
        } else if (host.includes("lever.co")) {
          if (pathParts[0]) company = pathParts[0];
        } else {
          const segs = host.replace(/^www\./, "").split(".");
          const brand = segs.find((seg) => !HOST_SKIP.has(seg));
          if (brand) company = brand;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return {
    company: prettyBrand(company).slice(0, 80),
    jobTitle: jobTitle.slice(0, 80),
  };
}
