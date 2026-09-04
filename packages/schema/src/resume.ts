import { z } from "zod";
import type { Profile } from "./profile";

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
  targetRole: z.string().default("校招"),
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

export function educationFromProfile(profile: Profile): z.infer<typeof resumeEducationSchema>[] {
  return profile.education.map((item) => ({
    id: item.id,
    school: item.school,
    major: item.major,
    degree: item.degree,
    period: [item.enrollDate, item.graduateDate].filter(Boolean).join(" – "),
    detail: [item.gpa && `GPA ${item.gpa}`, item.rank].filter(Boolean).join(" · "),
  }));
}

export function createResumeFromProfile(profile: Profile, id: string, at: string): Resume {
  return resumeSchema.parse({
    id,
    profileId: profile.id,
    templateId: "campus-onepage",
    version: 0,
    targetRole: "校招",
    basics: {
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      summary: "",
    },
    education: educationFromProfile(profile),
    internships: [],
    projects: [],
    skills: [],
    awards: [],
    createdAt: at,
    updatedAt: at,
  });
}

/**
 * Profile → Resume.basics / education only.
 * Internships, projects, skills, awards, summary stay on the resume.
 */
export function pullIdentityFromProfile(resume: Resume, profile: Profile): Resume {
  return {
    ...resume,
    basics: {
      ...resume.basics,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
    },
    education: educationFromProfile(profile),
  };
}
