import { z } from "zod";

export const educationItemSchema = z.object({
  id: z.string(),
  school: z.string().default(""),
  college: z.string().default(""),
  major: z.string().default(""),
  degree: z.enum(["高中", "专科", "本科", "硕士", "博士", "其他"]).default("本科"),
  enrollDate: z.string().default(""),
  graduateDate: z.string().default(""),
  gpa: z.string().default(""),
  rank: z.string().default(""),
});

export const qaItemSchema = z.object({
  key: z.string(),
  question: z.string(),
  answer: z.string().default(""),
});

export const profileSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  gender: z.enum(["男", "女", "其他", ""]).default(""),
  ethnicity: z.string().default(""),
  idType: z.enum(["身份证", "护照", "其他", ""]).default("身份证"),
  idNumber: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  politicalStatus: z.string().default(""),
  nativePlace: z.string().default(""),
  currentCity: z.string().default(""),
  education: z.array(educationItemSchema).default([]),
  jobType: z.enum(["实习", "校招", ""]).default("校招"),
  cities: z.array(z.string()).default([]),
  expectedSalary: z.string().default(""),
  availableDate: z.string().default(""),
  internToFull: z.boolean().default(true),
  resumePdfPath: z.string().default(""),
  photoPath: z.string().default(""),
  transcriptPath: z.string().default(""),
  qa: z.array(qaItemSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EducationItem = z.infer<typeof educationItemSchema>;
export type QaItem = z.infer<typeof qaItemSchema>;
export type Profile = z.infer<typeof profileSchema>;

export const profileWriteSchema = profileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  name: z.string().optional(),
});

export type ProfileWrite = z.infer<typeof profileWriteSchema>;

export const DEFAULT_QA: QaItem[] = [
  { key: "availableDate", question: "到岗时间", answer: "" },
  { key: "cities", question: "期望城市", answer: "" },
  { key: "expectedSalary", question: "期望薪资", answer: "" },
  { key: "acceptIntern", question: "是否接受实习", answer: "" },
  { key: "daysPerWeek", question: "每周到岗几天", answer: "" },
  { key: "cet4", question: "英语四级", answer: "" },
  { key: "cet6", question: "英语六级", answer: "" },
  { key: "ncre", question: "计算机二级", answer: "" },
  { key: "hasOffer", question: "是否已有 offer", answer: "" },
  { key: "acceptAdjust", question: "是否接受调剂", answer: "" },
  { key: "emergencyContact", question: "紧急联系人", answer: "" },
  { key: "nativePlace", question: "籍贯", answer: "" },
  { key: "politicalStatus", question: "政治面貌", answer: "" },
  { key: "marital", question: "婚育状况", answer: "" },
  { key: "currentCity", question: "现居住地", answer: "" },
];

export function isProfileComplete(profile: Profile): boolean {
  return Boolean(
    profile.name.trim() &&
      profile.phone.trim() &&
      profile.email.trim() &&
      profile.education.some((item) => item.school.trim() && item.degree),
  );
}
