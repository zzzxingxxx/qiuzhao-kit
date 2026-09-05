import {
  fillFieldPlanSchema,
  type FillFieldPlan,
  type FillMissingField,
  type FillPlan,
  type FormField,
  type Profile,
  type Resume,
} from "@qiuzhao/schema";

export type FillContext = {
  profile: Profile;
  resume: Resume | null;
};

type Rule = {
  source: string;
  confidence?: FillFieldPlan["confidence"];
  skip?: string;
  test: (h: string, field: FormField) => boolean;
  value: (ctx: FillContext) => string;
};

export function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-.:：*＊()（）[\]【】]/g, "");
}

function haystack(field: FormField): string {
  return norm([field.label, field.name, field.placeholder, field.autocomplete].filter(Boolean).join("|"));
}

function has(h: string, keys: string[]): boolean {
  return keys.some((key) => h.includes(norm(key)));
}

function primaryEdu(profile: Profile) {
  return profile.education.find((item) => item.school.trim()) ?? profile.education[0];
}

function qaAnswer(profile: Profile, key: string, questionBits: string[]): string {
  const hit =
    profile.qa.find((item) => item.key === key && item.answer.trim()) ??
    profile.qa.find((item) => questionBits.some((bit) => item.question.includes(bit)) && item.answer.trim());
  return hit?.answer.trim() ?? "";
}

function firstIntern(resume: Resume | null) {
  return resume?.internships.find((item) => item.org.trim() || item.title.trim()) ?? resume?.internships[0];
}

function skillText(resume: Resume | null): string {
  if (!resume) return "";
  if (resume.skillGroups.some((group) => group.items.trim())) {
    return resume.skillGroups
      .map((group) => [group.label, group.items].filter((part) => part.trim()).join("："))
      .filter(Boolean)
      .join("；");
  }
  return resume.skills.filter((item) => item.trim()).join("、");
}

function yesNo(value: boolean): string {
  return value ? "是" : "否";
}

export function matchSelectOption(value: string, options: string[]): string | null {
  if (!options.length) return value;
  const n = norm(value);
  if (!n) return null;
  for (const opt of options) {
    if (norm(opt) === n) return opt;
  }
  for (const opt of options) {
    const o = norm(opt);
    if (o && (o.includes(n) || n.includes(o))) return opt;
  }
  return null;
}

export function archiveText(ctx: FillContext): string {
  const { profile, resume } = ctx;
  const edu = profile.education.map((item) => ({
    school: item.school,
    major: item.major,
    degree: item.degree,
    enrollDate: item.enrollDate,
    graduateDate: item.graduateDate,
    gpa: item.gpa,
    rank: item.rank,
  }));
  const compactResume = resume
    ? {
        targetRole: resume.targetRole,
        summary: resume.basics.summary,
        internships: resume.internships.map((item) => ({
          org: item.org,
          title: item.title,
          period: item.period,
          tech: item.tech,
          bullets: item.bullets,
        })),
        projects: resume.projects.map((item) => ({
          org: item.org,
          title: item.title,
          period: item.period,
          tech: item.tech,
          bullets: item.bullets,
        })),
        campus: resume.campus.map((item) => ({
          org: item.org,
          title: item.title,
          period: item.period,
          bullets: item.bullets,
        })),
        skills: skillText(resume),
        awards: resume.awards,
      }
    : null;
  return JSON.stringify({
    name: profile.name,
    gender: profile.gender,
    ethnicity: profile.ethnicity,
    idType: profile.idType,
    idNumber: profile.idNumber,
    phone: profile.phone,
    email: profile.email,
    politicalStatus: profile.politicalStatus,
    nativePlace: profile.nativePlace,
    currentCity: profile.currentCity,
    jobType: profile.jobType,
    cities: profile.cities,
    expectedSalary: profile.expectedSalary,
    availableDate: profile.availableDate,
    internToFull: profile.internToFull,
    education: edu,
    qa: profile.qa.filter((item) => item.answer.trim()),
    resume: compactResume,
  });
}

export function compactArchive(ctx: FillContext): unknown {
  return JSON.parse(archiveText(ctx));
}

function valueGrounded(value: string, archive: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.length <= 4) return true;
  if (archive.includes(v)) return true;
  const parts = v.split(/[、,，;；/\n]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => part.length <= 1 || archive.includes(part))) return true;
  return false;
}

function applyOptions(field: FormField, value: string): string {
  if (!value) return "";
  if (!field.options.length) return value;
  return matchSelectOption(value, field.options) ?? "";
}

const RULES: Rule[] = [
  {
    source: "",
    skip: "不填密码",
    test: (h) => has(h, ["密码", "password"]),
    value: () => "",
  },
  {
    source: "",
    skip: "不填验证码",
    test: (h) => has(h, ["验证码", "captcha", "vcode", "verifycode", "sms代码", "短信验证"]),
    value: () => "",
  },
  {
    source: "",
    skip: "不填登录账号",
    test: (h) => has(h, ["用户名", "账号", "username", "login", "account"]) && !has(h, ["姓名", "手机", "邮箱"]),
    value: () => "",
  },
  {
    source: "profile.email",
    confidence: "high",
    test: (h, field) => field.type === "email" || has(h, ["邮箱", "电子邮件", "email", "mail"]),
    value: (ctx) => ctx.profile.email,
  },
  {
    source: "profile.phone",
    confidence: "high",
    test: (h, field) =>
      (field.type === "tel" || has(h, ["手机号", "手机", "联系电话", "移动电话", "电话", "mobile", "phone", "tel"])) &&
      !has(h, ["紧急", "家长", "父母", "监护"]),
    value: (ctx) => ctx.profile.phone,
  },
  {
    source: "profile.name",
    confidence: "high",
    test: (h) =>
      (has(h, ["真实姓名", "姓名", "名字", "fullname", "yourname"]) || /(^|\|)name(\||$)/.test(h)) &&
      !has(h, ["学校", "公司", "紧急", "用户", "账号", "org", "file", "文件", "user"]),
    value: (ctx) => ctx.profile.name,
  },
  {
    source: "profile.gender",
    confidence: "high",
    test: (h) => has(h, ["性别", "gender", "sex"]) && !has(h, ["性向"]),
    value: (ctx) => ctx.profile.gender,
  },
  {
    source: "profile.idNumber",
    confidence: "high",
    test: (h) => has(h, ["身份证号", "身份证", "证件号码", "证件号", "idnumber", "idcard", "idno"]),
    value: (ctx) => ctx.profile.idNumber,
  },
  {
    source: "profile.idType",
    confidence: "high",
    test: (h) => has(h, ["证件类型", "证件种类", "idtype"]),
    value: (ctx) => ctx.profile.idType,
  },
  {
    source: "profile.ethnicity",
    confidence: "high",
    test: (h) => has(h, ["民族", "ethnicity"]),
    value: (ctx) => ctx.profile.ethnicity,
  },
  {
    source: "profile.politicalStatus",
    confidence: "high",
    test: (h) => has(h, ["政治面貌", "政治面貌", "党派"]),
    value: (ctx) => ctx.profile.politicalStatus || qaAnswer(ctx.profile, "politicalStatus", ["政治面貌"]),
  },
  {
    source: "profile.nativePlace",
    confidence: "high",
    test: (h) => has(h, ["籍贯", "户口", "nativeplace"]),
    value: (ctx) => ctx.profile.nativePlace || qaAnswer(ctx.profile, "nativePlace", ["籍贯"]),
  },
  {
    source: "profile.currentCity",
    confidence: "high",
    test: (h) =>
      has(h, ["现居", "现居住地", "居住地", "所在城市", "目前城市", "currentcity"]) &&
      !has(h, ["期望", "意向"]),
    value: (ctx) => ctx.profile.currentCity || qaAnswer(ctx.profile, "currentCity", ["现居住地", "居住"]),
  },
  {
    source: "profile.education.school",
    confidence: "high",
    test: (h) => has(h, ["毕业院校", "学校名称", "院校", "学校", "school", "university", "college"]) && !has(h, ["学院"]),
    value: (ctx) => primaryEdu(ctx.profile)?.school ?? "",
  },
  {
    source: "profile.education.college",
    confidence: "medium",
    test: (h) => has(h, ["学院", "院系"]),
    value: (ctx) => primaryEdu(ctx.profile)?.college ?? "",
  },
  {
    source: "profile.education.major",
    confidence: "high",
    test: (h) => has(h, ["专业", "major"]),
    value: (ctx) => primaryEdu(ctx.profile)?.major ?? "",
  },
  {
    source: "profile.education.degree",
    confidence: "high",
    test: (h) => has(h, ["学历", "学位", "degree"]),
    value: (ctx) => primaryEdu(ctx.profile)?.degree ?? "",
  },
  {
    source: "profile.education.gpa",
    confidence: "high",
    test: (h) => has(h, ["gpa", "绩点", "成绩"]),
    value: (ctx) => primaryEdu(ctx.profile)?.gpa ?? "",
  },
  {
    source: "profile.education.enrollDate",
    confidence: "medium",
    test: (h) => has(h, ["入学时间", "入学日期", "enroll"]),
    value: (ctx) => primaryEdu(ctx.profile)?.enrollDate ?? "",
  },
  {
    source: "profile.education.graduateDate",
    confidence: "medium",
    test: (h) => has(h, ["毕业时间", "毕业日期", "graduate"]),
    value: (ctx) => primaryEdu(ctx.profile)?.graduateDate ?? "",
  },
  {
    source: "profile.cities",
    confidence: "high",
    test: (h) => has(h, ["期望城市", "意向城市", "工作城市"]),
    value: (ctx) =>
      ctx.profile.cities.filter(Boolean).join("、") || qaAnswer(ctx.profile, "cities", ["期望城市", "意向城市"]),
  },
  {
    source: "profile.expectedSalary",
    confidence: "high",
    test: (h) => has(h, ["期望薪资", "期望工资", "薪资", "salary"]),
    value: (ctx) => ctx.profile.expectedSalary || qaAnswer(ctx.profile, "expectedSalary", ["期望薪资", "薪资"]),
  },
  {
    source: "profile.availableDate",
    confidence: "high",
    test: (h) => has(h, ["到岗时间", "入职时间", "可到岗", "available"]),
    value: (ctx) => ctx.profile.availableDate || qaAnswer(ctx.profile, "availableDate", ["到岗"]),
  },
  {
    source: "profile.jobType",
    confidence: "medium",
    test: (h) => has(h, ["求职类型", "岗位类型", "实习校招"]),
    value: (ctx) => ctx.profile.jobType,
  },
  {
    source: "qa.cet4",
    confidence: "high",
    test: (h) => has(h, ["英语四级", "cet4", "cet-4", "四级成绩"]),
    value: (ctx) => qaAnswer(ctx.profile, "cet4", ["英语四级", "四级"]),
  },
  {
    source: "qa.cet6",
    confidence: "high",
    test: (h) => has(h, ["英语六级", "cet6", "cet-6", "六级成绩"]),
    value: (ctx) => qaAnswer(ctx.profile, "cet6", ["英语六级", "六级"]),
  },
  {
    source: "qa.ncre",
    confidence: "medium",
    test: (h) => has(h, ["计算机二级", "ncre"]),
    value: (ctx) => qaAnswer(ctx.profile, "ncre", ["计算机二级"]),
  },
  {
    source: "qa.acceptAdjust",
    confidence: "medium",
    test: (h) => has(h, ["调剂", "接受调剂"]),
    value: (ctx) => qaAnswer(ctx.profile, "acceptAdjust", ["调剂"]),
  },
  {
    source: "qa.hasOffer",
    confidence: "medium",
    test: (h) => has(h, ["已有offer", "是否已有", "offer"]),
    value: (ctx) => qaAnswer(ctx.profile, "hasOffer", ["offer"]),
  },
  {
    source: "profile.internToFull",
    confidence: "medium",
    test: (h) => has(h, ["实习转正", "接受实习", "是否实习"]),
    value: (ctx) => qaAnswer(ctx.profile, "acceptIntern", ["是否接受实习"]) || yesNo(ctx.profile.internToFull),
  },
  {
    source: "qa.daysPerWeek",
    confidence: "medium",
    test: (h) => has(h, ["每周", "到岗几天", "出勤"]),
    value: (ctx) => qaAnswer(ctx.profile, "daysPerWeek", ["每周"]),
  },
  {
    source: "qa.emergencyContact",
    confidence: "high",
    test: (h) => has(h, ["紧急联系人", "紧急联络"]),
    value: (ctx) => qaAnswer(ctx.profile, "emergencyContact", ["紧急联系人"]),
  },
  {
    source: "qa.marital",
    confidence: "medium",
    test: (h) => has(h, ["婚育", "婚姻"]),
    value: (ctx) => qaAnswer(ctx.profile, "marital", ["婚育", "婚姻"]),
  },
  {
    source: "resume.summary",
    confidence: "high",
    test: (h) => has(h, ["自我评价", "自我介绍", "个人简介", "个人陈述", "coverletter", "selfintro"]),
    value: (ctx) => ctx.resume?.basics.summary.trim() ?? "",
  },
  {
    source: "resume.internships.org",
    confidence: "medium",
    test: (h) => has(h, ["实习单位", "实习公司", "最近实习"]),
    value: (ctx) => firstIntern(ctx.resume)?.org ?? "",
  },
  {
    source: "resume.internships.title",
    confidence: "medium",
    test: (h) => has(h, ["实习岗位", "实习职位"]),
    value: (ctx) => firstIntern(ctx.resume)?.title ?? "",
  },
  {
    source: "resume.skills",
    confidence: "medium",
    test: (h) => has(h, ["专业技能", "掌握技能", "技能特长", "技能"]),
    value: (ctx) => skillText(ctx.resume),
  },
];

export function assemblePlan(
  fields: FormField[],
  mapped: FillFieldPlan[],
  extra: Partial<FillPlan> = {},
): FillPlan {
  const byId = new Map(mapped.map((item) => [item.id, item]));
  const result: FillFieldPlan[] = [];
  const missing: FillMissingField[] = [];
  for (const field of fields) {
    const label = field.label || field.name || field.id;
    const row = byId.get(field.id);
    if (!row || !row.value.trim()) {
      const skip = row?.skipReason ?? "";
      const reason =
        skip.startsWith("不填") || skip === "选项对不上" || skip === "档案里没有对应原文"
          ? skip
          : field.required
            ? "必填，但档案里没有"
            : skip || "档案里没有对应项";
      result.push({
        id: field.id,
        label,
        value: "",
        source: row?.source ?? "",
        confidence: "low",
        skipReason: reason,
      });
      missing.push({ id: field.id, label, reason });
      continue;
    }
    result.push({ ...row, label });
  }
  return {
    fields: result,
    missingFields: missing,
    usedAi: false,
    needsKey: false,
    ...extra,
  };
}

export function similarQuestion(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true;
  return false;
}

function matchStoredQa(profile: Profile, field: FormField) {
  const label = field.label || field.name;
  return profile.qa.find((item) => item.answer.trim() && similarQuestion(item.question, label));
}

export function heuristicMap(fields: FormField[], ctx: FillContext): FillPlan {
  const mapped: FillFieldPlan[] = [];
  for (const field of fields) {
    const h = haystack(field);
    const rule = RULES.find((item) => item.test(h, field));
    if (!rule) {
      const qaHit = matchStoredQa(ctx.profile, field);
      if (!qaHit) continue;
      const value = applyOptions(field, qaHit.answer);
      if (!value) continue;
      mapped.push({
        id: field.id,
        label: field.label,
        value,
        source: `qa.${qaHit.key}`,
        confidence: "high",
      });
      continue;
    }
    if (rule.skip) {
      mapped.push({
        id: field.id,
        label: field.label,
        value: "",
        source: rule.source,
        confidence: "low",
        skipReason: rule.skip,
      });
      continue;
    }
    const raw = rule.value(ctx).trim();
    const value = applyOptions(field, raw);
    if (!raw) {
      mapped.push({
        id: field.id,
        label: field.label,
        value: "",
        source: rule.source,
        confidence: "low",
        skipReason: "档案里没有对应项",
      });
      continue;
    }
    if (field.options.length && !value) {
      mapped.push({
        id: field.id,
        label: field.label,
        value: "",
        source: rule.source,
        confidence: "low",
        skipReason: "选项对不上",
      });
      continue;
    }
    mapped.push({
      id: field.id,
      label: field.label,
      value,
      source: rule.source,
      confidence: rule.confidence ?? "medium",
    });
  }
  return assemblePlan(fields, mapped);
}

export function planFromModelJson(raw: unknown, fields: FormField[], ctx: FillContext): FillPlan {
  const archive = archiveText(ctx);
  const fieldById = new Map(fields.map((item) => [item.id, item]));
  const obj = raw && typeof raw === "object" ? (raw as { fields?: unknown }) : {};
  const list = Array.isArray(obj.fields) ? obj.fields : [];
  const mapped: FillFieldPlan[] = [];
  for (const item of list) {
    const parsed = fillFieldPlanSchema.safeParse(item);
    if (!parsed.success) continue;
    const row = parsed.data;
    const field = fieldById.get(row.id);
    if (!field) continue;
    let value = row.value.trim();
    if (field.options.length && value) {
      const matched = matchSelectOption(value, field.options);
      if (!matched) {
        mapped.push({
          ...row,
          label: field.label,
          value: "",
          confidence: "low",
          skipReason: row.skipReason || "选项对不上",
        });
        continue;
      }
      value = matched;
    }
    if (value && field.type !== "textarea" && value.length > 4 && !valueGrounded(value, archive)) {
      mapped.push({
        ...row,
        label: field.label,
        value: "",
        confidence: "low",
        skipReason: "档案里没有对应原文",
      });
      continue;
    }
    mapped.push({
      ...row,
      label: field.label,
      value,
      skipReason: value ? undefined : row.skipReason || "档案里没有对应项",
    });
  }
  return assemblePlan(fields, mapped, { usedAi: true });
}

export function mergeFillPlans(fields: FormField[], heuristic: FillPlan, ai: FillPlan): FillPlan {
  const aiById = new Map(ai.fields.map((item) => [item.id, item]));
  const mapped: FillFieldPlan[] = heuristic.fields.map((row) => {
    const other = aiById.get(row.id);
    if (!other) return row;
    const heuristicFilled = Boolean(row.value.trim()) && !row.skipReason;
    const identity = row.source.startsWith("profile.") && !row.source.includes("qa");
    if (heuristicFilled && identity && row.confidence === "high") return row;
    if (heuristicFilled && row.confidence === "high" && other.confidence !== "high") return row;
    if (other.value.trim() && !other.skipReason) {
      return { ...other, label: row.label || other.label };
    }
    return row;
  });
  return assemblePlan(fields, mapped, {
    usedAi: true,
    needsKey: false,
    atsNote: heuristic.atsNote,
    profileName: heuristic.profileName,
    resumeRole: heuristic.resumeRole,
  });
}
