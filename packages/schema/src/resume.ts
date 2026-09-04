import { z } from "zod";
import type { Profile } from "./profile";
import { createCompleteSampleResume, resolveResumeTemplateId } from "./templates";

export const RESUME_SECTION_KEYS = [
  "education",
  "internships",
  "projects",
  "skills",
  "campus",
  "awards",
  "summary",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

export const RESUME_SECTION_LABELS: Record<ResumeSectionKey, string> = {
  education: "教育背景",
  internships: "实习经历",
  projects: "项目经历",
  skills: "专业技能",
  campus: "校园经历",
  awards: "荣誉奖项",
  summary: "自我评价",
};

export const DEFAULT_RESUME_SECTIONS: { key: ResumeSectionKey; visible: boolean }[] = [
  { key: "education", visible: true },
  { key: "internships", visible: true },
  { key: "projects", visible: true },
  { key: "skills", visible: true },
  { key: "campus", visible: true },
  { key: "awards", visible: true },
  { key: "summary", visible: true },
];

export const RESUME_THEME_PRESETS = [
  { label: "藏青", color: "#1f4e79" },
  { label: "石墨", color: "#2f3437" },
  { label: "松绿", color: "#0f766e" },
  { label: "墨绿", color: "#1f6f5b" },
  { label: "绛红", color: "#8c2f39" },
  { label: "靛蓝", color: "#1d4ed8" },
  { label: "岩灰", color: "#475569" },
  { label: "葡萄", color: "#6d28d9" },
  { label: "琥珀", color: "#b45309" },
] as const;

export const resumeThemeSchema = z.object({
  color: z.string().default("#1f4e79"),
  density: z.enum(["compact", "normal", "relaxed"]).default("normal"),
  fontSizePt: z.number().min(9).max(13).default(10.5),
  showPhoto: z.boolean().default(false),
});

export const resumeSectionSchema = z.object({
  key: z.enum(RESUME_SECTION_KEYS),
  visible: z.boolean().default(true),
});

export const resumeBasicsSchema = z.object({
  name: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  wechat: z.string().default(""),
  github: z.string().default(""),
  website: z.string().default(""),
  location: z.string().default(""),
  photo: z.string().default(""),
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
  tech: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const resumeSkillGroupSchema = z.object({
  id: z.string(),
  label: z.string().default(""),
  items: z.string().default(""),
});

export const resumeSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  templateId: z.string().default("campus-tech"),
  version: z.number().int().nonnegative().default(0),
  targetRole: z.string().default("校招"),
  basics: resumeBasicsSchema.default({}),
  education: z.array(resumeEducationSchema).default([]),
  internships: z.array(resumeExperienceSchema).default([]),
  projects: z.array(resumeExperienceSchema).default([]),
  campus: z.array(resumeExperienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  skillGroups: z.array(resumeSkillGroupSchema).default([]),
  awards: z.array(z.string()).default([]),
  theme: resumeThemeSchema.default({}),
  sections: z.array(resumeSectionSchema).default(() =>
    DEFAULT_RESUME_SECTIONS.map((item) => ({ ...item })),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeTheme = z.infer<typeof resumeThemeSchema>;
export type ResumeSkillGroup = z.infer<typeof resumeSkillGroupSchema>;
export const resumeWriteSchema = resumeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
export type ResumeWrite = z.infer<typeof resumeWriteSchema>;

export function normalizeResume(resume: Resume): Resume {
  const seen = new Set(resume.sections.map((item) => item.key));
  const sections = [
    ...resume.sections.filter((item) =>
      (RESUME_SECTION_KEYS as readonly string[]).includes(item.key),
    ),
    ...DEFAULT_RESUME_SECTIONS.filter((item) => !seen.has(item.key)).map((item) => ({ ...item })),
  ];
  let skillGroups = resume.skillGroups;
  if (skillGroups.length === 0 && resume.skills.some((item) => item.trim())) {
    skillGroups = [
      {
        id: "migrated-skills",
        label: "专业技能",
        items: resume.skills.filter((item) => item.trim()).join(" / "),
      },
    ];
  }
  const skills = skillGroups.length
    ? skillGroups.flatMap((group) =>
        group.items
          .split(/[/、,，;；|]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      )
    : resume.skills;
  return {
    ...resume,
    templateId: resolveResumeTemplateId(resume.templateId),
    sections,
    skillGroups,
    skills,
  };
}

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
  const complete = createCompleteSampleResume("campus-tech");
  const hasEducation = profile.education.some((item) => item.school.trim());
  return {
    ...complete,
    id,
    profileId: profile.id,
    version: 0,
    createdAt: at,
    updatedAt: at,
    basics: {
      ...complete.basics,
      name: profile.name.trim() || complete.basics.name,
      phone: profile.phone.trim() || complete.basics.phone,
      email: profile.email.trim() || complete.basics.email,
      location: profile.currentCity.trim() || complete.basics.location,
    },
    education: hasEducation ? educationFromProfile(profile) : complete.education,
  };
}

/**
 * Profile → Resume.basics / education only.
 * Internships, projects, campus, skills, awards, summary stay on the resume.
 */
export function pullIdentityFromProfile(resume: Resume, profile: Profile): Resume {
  return {
    ...resume,
    basics: {
      ...resume.basics,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      location: profile.currentCity || resume.basics.location,
    },
    education: educationFromProfile(profile),
  };
}
