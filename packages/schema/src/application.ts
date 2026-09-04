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
