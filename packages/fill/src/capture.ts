import {
  profileSchema,
  resumeSchema,
  type EducationItem,
  type FillCaptureChange,
  type FillCaptureItem,
  type Profile,
  type Resume,
} from "@qiuzhao/schema";
import { norm, similarQuestion } from "./heuristic";

export type FillCaptureOptions = {
  overwrite?: boolean;
};

const DEGREES = ["高中", "专科", "本科", "硕士", "博士", "其他"] as const;
const GENDERS = ["男", "女", "其他"] as const;
const ID_TYPES = ["身份证", "护照", "其他"] as const;
const JOB_TYPES = ["实习", "校招"] as const;

function cloneProfile(profile: Profile): Profile {
  return profileSchema.parse(JSON.parse(JSON.stringify(profile)));
}

function cloneResume(resume: Resume): Resume {
  return resumeSchema.parse(JSON.parse(JSON.stringify(resume)));
}

function qaKeyFromLabel(label: string): string {
  const n = norm(label).replace(/[^\w\u4e00-\u9fff]/g, "");
  return n ? `ext-${n.slice(0, 40)}` : "ext-unknown";
}

function parseGender(value: string): (typeof GENDERS)[number] | "" {
  const n = norm(value);
  if (n.includes("男") && !n.includes("女")) return "男";
  if (n.includes("女") && !n.includes("男")) return "女";
  if (n.includes("其他") || n.includes("其它")) return "其他";
  return "";
}

function parseDegree(value: string): (typeof DEGREES)[number] | "" {
  const n = norm(value);
  const hit = DEGREES.find((item) => n.includes(item));
  return hit ?? "";
}

function parseIdType(value: string): (typeof ID_TYPES)[number] | "" {
  if (value.includes("护照")) return "护照";
  if (value.includes("身份证")) return "身份证";
  if (value.includes("其他") || value.includes("其它")) return "其他";
  return "";
}

function parseJobType(value: string): (typeof JOB_TYPES)[number] | "" {
  if (value.includes("实习")) return "实习";
  if (value.includes("校招") || value.includes("全职")) return "校招";
  return "";
}

function parseCities(value: string): string[] {
  return value
    .split(/[、,，;；/\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function shouldSkip(item: FillCaptureItem): string | null {
  const value = item.value.trim();
  if (!value) return "空值";
  const hay = `${item.label} ${item.source}`;
  if (/密码|验证码|captcha|password/i.test(hay)) return "不写入密码或验证码";
  return null;
}

function takeIfEmpty(current: string, next: string, overwrite: boolean): string | null {
  const value = next.trim();
  if (!value) return null;
  if (current.trim() === value) return null;
  if (current.trim() && !overwrite) return null;
  return value;
}

function ensureEdu(profile: Profile): EducationItem {
  if (!profile.education.length) {
    profile.education.push({
      id: `edu-${Date.now()}`,
      school: "",
      college: "",
      major: "",
      degree: "本科",
      enrollDate: "",
      graduateDate: "",
      gpa: "",
      rank: "",
    });
  }
  return profile.education.find((item) => item.school.trim()) ?? profile.education[0];
}

function upsertQa(profile: Profile, key: string, question: string, answer: string, overwrite: boolean) {
  const byKey = profile.qa.find((item) => item.key === key);
  const byQuestion = profile.qa.find((item) => similarQuestion(item.question, question));
  const row = byKey ?? byQuestion;
  if (row) {
    const next = takeIfEmpty(row.answer, answer, overwrite);
    if (!next) return null;
    const from = row.answer;
    row.answer = next;
    if (!row.question.trim()) row.question = question;
    return { from, to: next, path: `qa.${row.key}` };
  }
  profile.qa.push({ key, question: question || key, answer: answer.trim() });
  return { from: "", to: answer.trim(), path: `qa.${key}` };
}

function setProfileString(
  profile: Profile,
  path: string,
  key: keyof Profile,
  value: string,
  overwrite: boolean,
): FillCaptureChange | null {
  const current = typeof profile[key] === "string" ? String(profile[key]) : "";
  const next = takeIfEmpty(current, value, overwrite);
  if (!next) return null;
  (profile[key] as string) = next;
  return { target: "profile", path, label: path, from: current, to: next };
}

export function applyFillCapture(
  profile: Profile,
  resume: Resume | null,
  items: FillCaptureItem[],
  options: FillCaptureOptions = {},
): {
  profile: Profile;
  resume: Resume | null;
  applied: FillCaptureChange[];
  skipped: { label: string; reason: string }[];
  resumeChanged: boolean;
} {
  const overwrite = Boolean(options.overwrite);
  const nextProfile = cloneProfile(profile);
  const nextResume = resume ? cloneResume(resume) : null;
  const applied: FillCaptureChange[] = [];
  const skipped: { label: string; reason: string }[] = [];
  let resumeChanged = false;

  for (const item of items) {
    const blocked = shouldSkip(item);
    if (blocked) {
      skipped.push({ label: item.label || item.id, reason: blocked });
      continue;
    }
    const value = item.value.trim();
    const label = item.label || item.source || item.id;
    const source = item.source.trim();

    const push = (change: FillCaptureChange | null, fallbackSkip?: string) => {
      if (change) {
        change.label = label;
        applied.push(change);
      } else if (fallbackSkip) {
        skipped.push({ label, reason: fallbackSkip });
      } else {
        skipped.push({ label, reason: "档案里已有，未覆盖" });
      }
    };

    if (source === "profile.name") {
      push(setProfileString(nextProfile, "name", "name", value, overwrite));
      continue;
    }
    if (source === "profile.phone") {
      push(setProfileString(nextProfile, "phone", "phone", value, overwrite));
      continue;
    }
    if (source === "profile.email") {
      push(setProfileString(nextProfile, "email", "email", value, overwrite));
      continue;
    }
    if (source === "profile.gender") {
      const gender = parseGender(value);
      if (!gender) {
        skipped.push({ label, reason: "性别无法识别" });
        continue;
      }
      push(setProfileString(nextProfile, "gender", "gender", gender, overwrite));
      continue;
    }
    if (source === "profile.ethnicity") {
      push(setProfileString(nextProfile, "ethnicity", "ethnicity", value, overwrite));
      continue;
    }
    if (source === "profile.idNumber") {
      push(setProfileString(nextProfile, "idNumber", "idNumber", value, overwrite));
      continue;
    }
    if (source === "profile.idType") {
      const idType = parseIdType(value);
      if (!idType) {
        skipped.push({ label, reason: "证件类型无法识别" });
        continue;
      }
      push(setProfileString(nextProfile, "idType", "idType", idType, overwrite));
      continue;
    }
    if (source === "profile.politicalStatus") {
      const change = setProfileString(nextProfile, "politicalStatus", "politicalStatus", value, overwrite);
      upsertQa(nextProfile, "politicalStatus", "政治面貌", value, overwrite);
      push(change);
      continue;
    }
    if (source === "profile.nativePlace") {
      const change = setProfileString(nextProfile, "nativePlace", "nativePlace", value, overwrite);
      upsertQa(nextProfile, "nativePlace", "籍贯", value, overwrite);
      push(change);
      continue;
    }
    if (source === "profile.currentCity") {
      const change = setProfileString(nextProfile, "currentCity", "currentCity", value, overwrite);
      upsertQa(nextProfile, "currentCity", "现居住地", value, overwrite);
      push(change);
      continue;
    }
    if (source === "profile.expectedSalary") {
      const change = setProfileString(nextProfile, "expectedSalary", "expectedSalary", value, overwrite);
      upsertQa(nextProfile, "expectedSalary", "期望薪资", value, overwrite);
      push(change);
      continue;
    }
    if (source === "profile.availableDate") {
      const change = setProfileString(nextProfile, "availableDate", "availableDate", value, overwrite);
      upsertQa(nextProfile, "availableDate", "到岗时间", value, overwrite);
      push(change);
      continue;
    }
    if (source === "profile.jobType") {
      const jobType = parseJobType(value);
      if (!jobType) {
        skipped.push({ label, reason: "求职类型无法识别" });
        continue;
      }
      push(setProfileString(nextProfile, "jobType", "jobType", jobType, overwrite));
      continue;
    }
    if (source === "profile.cities") {
      const current = nextProfile.cities.join("、");
      if (current.trim() && !overwrite) {
        skipped.push({ label, reason: "档案里已有，未覆盖" });
        continue;
      }
      const cities = parseCities(value);
      if (!cities.length) {
        skipped.push({ label, reason: "城市无法识别" });
        continue;
      }
      nextProfile.cities = cities;
      upsertQa(nextProfile, "cities", "期望城市", cities.join("、"), overwrite);
      applied.push({ target: "profile", path: "cities", label, from: current, to: cities.join("、") });
      continue;
    }
    if (source.startsWith("profile.education.")) {
      const edu = ensureEdu(nextProfile);
      const field = source.slice("profile.education.".length);
      const eduEmpty = !edu.school.trim();
      const allow = overwrite || eduEmpty;
      if (field === "degree") {
        const degree = parseDegree(value);
        if (!degree) {
          skipped.push({ label, reason: "学历无法识别" });
          continue;
        }
        if (edu.degree && edu.degree !== "本科" && !allow && edu.degree === degree) {
          skipped.push({ label, reason: "档案里已有，未覆盖" });
          continue;
        }
        const currentDegree = eduEmpty ? "" : edu.degree;
        const next = takeIfEmpty(currentDegree, degree, allow);
        if (!next) {
          skipped.push({ label, reason: "档案里已有，未覆盖" });
          continue;
        }
        const from = edu.degree;
        edu.degree = degree;
        applied.push({ target: "profile", path: source, label, from, to: degree });
        continue;
      }
      const key = field as keyof EducationItem;
      if (typeof edu[key] !== "string") {
        skipped.push({ label, reason: "教育字段无法写入" });
        continue;
      }
      const current = String(edu[key]);
      const next = takeIfEmpty(eduEmpty && key !== "school" ? "" : current, value, allow);
      if (!next) {
        skipped.push({ label, reason: "档案里已有，未覆盖" });
        continue;
      }
      (edu[key] as string) = next;
      applied.push({ target: "profile", path: source, label, from: current, to: next });
      continue;
    }
    if (source.startsWith("qa.")) {
      const key = source.slice(3) || qaKeyFromLabel(label);
      const hit = upsertQa(nextProfile, key, label, value, overwrite);
      if (!hit) {
        skipped.push({ label, reason: "档案里已有，未覆盖" });
        continue;
      }
      applied.push({ target: "qa", path: hit.path, label, from: hit.from, to: hit.to });
      continue;
    }
    if (source === "resume.summary" && nextResume) {
      const current = nextResume.basics.summary;
      const next = takeIfEmpty(current, value, overwrite);
      if (!next) {
        skipped.push({ label, reason: "简历里已有，未覆盖" });
        continue;
      }
      nextResume.basics.summary = next;
      resumeChanged = true;
      applied.push({ target: "resume", path: "summary", label, from: current, to: next });
      continue;
    }
    if (source === "resume.skills" && nextResume) {
      const current = nextResume.skillGroups[0]?.items ?? nextResume.skills.join("、");
      const next = takeIfEmpty(current, value, overwrite);
      if (!next) {
        skipped.push({ label, reason: "简历里已有，未覆盖" });
        continue;
      }
      if (nextResume.skillGroups[0]) nextResume.skillGroups[0].items = next;
      else nextResume.skills = parseCities(value);
      resumeChanged = true;
      applied.push({ target: "resume", path: "skills", label, from: current, to: next });
      continue;
    }
    if (source.startsWith("resume.") && !nextResume) {
      skipped.push({ label, reason: "没有简历可写入，已改记入档案问答" });
    }

    const key = source.startsWith("qa.") ? source.slice(3) : qaKeyFromLabel(label);
    const hit = upsertQa(nextProfile, key, label, value, overwrite);
    if (!hit) {
      skipped.push({ label, reason: "档案里已有，未覆盖" });
      continue;
    }
    applied.push({ target: "qa", path: hit.path, label, from: hit.from, to: hit.to });
  }

  return { profile: nextProfile, resume: nextResume, applied, skipped, resumeChanged };
}
