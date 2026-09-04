import type { Resume } from "./resume";
import type { ResumeTemplateMeta } from "./templates";

/** 1 寸证件照占位，完整模板预览用。 */
export const SAMPLE_PHOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="504" viewBox="0 0 360 504">
      <rect fill="#d7dde5" width="360" height="504"/>
      <circle cx="180" cy="170" r="78" fill="#9aa7b5"/>
      <ellipse cx="180" cy="430" rx="140" ry="150" fill="#9aa7b5"/>
    </svg>`,
  );

export type CompleteSampleIds = {
  id: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
};

function nid(prefix: string) {
  return `sample-${prefix}`;
}

/** 一份完整校招一页纸示例：教育、两段实习、两个项目、技能分组、校园、奖项、评价。 */
export function buildCompleteSampleResume(
  tpl: ResumeTemplateMeta,
  ids: CompleteSampleIds,
): Resume {
  const at = ids.updatedAt;
  return {
    id: ids.id,
    profileId: ids.profileId,
    templateId: tpl.id,
    version: ids.version ?? 0,
    targetRole: "后端开发",
    basics: {
      name: "张三",
      phone: "13800001111",
      email: "zhangsan@example.com",
      wechat: "zhangsan_dev",
      github: "zhangsan",
      website: "https://github.com/zhangsan",
      location: "上海",
      photo: SAMPLE_PHOTO,
      summary:
        "计算机专业应届生，两年业务后端实习经历。熟悉 Java / Go 与常见中间件，能独立负责中等规模接口与数据任务，注重可观测性和交付质量。",
    },
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "计算机科学与技术",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail: "GPA 3.72 / 4.00 · 专业前 15% · 主修操作系统 / 计算机网络 / 数据库",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "某互联网公司",
        title: "后端开发实习",
        period: "2025.07 – 2025.09",
        tech: "Java · Spring Boot · MySQL · Redis · Kafka",
        bullets: [
          "负责订单查询接口改造，P99 从 420ms 降到 160ms，高峰 QPS 提升约 2 倍",
          "补齐核心链路日志与指标，线上超时工单下降约 35%",
          "参与评审与单测，相关模块覆盖率提到 80% 以上",
        ],
      },
      {
        id: nid("job-2"),
        org: "某数据科技公司",
        title: "服务端开发实习",
        period: "2024.07 – 2024.09",
        tech: "Go · PostgreSQL · gRPC",
        bullets: [
          "实现内部配置下发服务，支持灰度与回滚，覆盖 4 条业务线",
          "编写同步任务与失败重试，周失败率从 3.1% 降到 0.4%",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "校招网申助手",
        title: "全栈 / 负责人",
        period: "2025.03 – 至今",
        tech: "TypeScript · Vue 3 · Hono · SQLite",
        bullets: [
          "本机优先的校招档案与一页纸简历，支持多模板实时预览和打印导出 PDF",
          "统一 Zod 数据契约，档案只回写身份与教育，实习项目留在简历版本中",
        ],
      },
      {
        id: nid("proj-2"),
        org: "分布式在线评测",
        title: "后端",
        period: "2024.09 – 2025.01",
        tech: "Go · Redis · Docker",
        bullets: [
          "设计判题队列与沙箱调度，单机稳定 50 并发，超时任务可回收",
          "提供提交、评测、榜单 API，课程使用人数 200+",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "计算机协会",
        title: "技术部部长",
        period: "2023.09 – 2025.06",
        tech: "",
        bullets: [
          "组织 6 场校内技术分享与一次黑客马拉松，单场最高 120 人参与",
          "带 8 人技术组维护协会主页和报名系统",
        ],
      },
    ],
    skillGroups: [
      {
        id: nid("skill-1"),
        label: "语言 / 框架",
        items: "Java / Go / TypeScript · Spring Boot / Vue 3 / Hono",
      },
      {
        id: nid("skill-2"),
        label: "数据 / 中间件",
        items: "MySQL / PostgreSQL / Redis / Kafka · Linux / Git / Docker",
      },
      {
        id: nid("skill-3"),
        label: "英语",
        items: "CET-6 · 可阅读英文文档与论文",
      },
    ],
    skills: ["Java", "Go", "TypeScript", "Spring Boot", "MySQL", "Redis"],
    awards: [
      "2025 全国大学生程序设计竞赛 铜奖",
      "2024 校级优秀学生干部",
      "2023 校奖学金 二等奖",
    ],
    theme: {
      color: tpl.color,
      density: "compact",
      fontSizePt: 10,
      showPhoto: tpl.showPhoto,
    },
    sections: [
      { key: "education", visible: true },
      { key: "internships", visible: true },
      { key: "projects", visible: true },
      { key: "skills", visible: true },
      { key: "campus", visible: true },
      { key: "awards", visible: true },
      { key: "summary", visible: true },
    ],
    createdAt: ids.createdAt,
    updatedAt: at,
  };
}
