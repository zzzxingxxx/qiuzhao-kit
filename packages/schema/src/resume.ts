import { z } from "zod";

export const resumeBasicsSchema = z.object({
  name: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  summary: z.string().default(""),
});

export const resumeEducationSchema = z.object({
  id: z.string(),
  school: z.string().default(""),
  major: z.string().default(""),
  degree: z.string().default(""),
  period: z.string().default(""),
  detail: z.string().default(""),
});

export const resumeExperienceSchema = z.object({
  id: z.string(),
  org: z.string().default(""),
  title: z.string().default(""),
  period: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const resumeSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  templateId: z.literal("campus-onepage").default("campus-onepage"),
  version: z.number().int().nonnegative().default(0),
  basics: resumeBasicsSchema.default({}),
  education: z.array(resumeEducationSchema).default([]),
  internships: z.array(resumeExperienceSchema).default([]),
  projects: z.array(resumeExperienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  awards: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Resume = z.infer<typeof resumeSchema>;
export const resumeWriteSchema = resumeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
export type ResumeWrite = z.infer<typeof resumeWriteSchema>;
