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

type Pack = "backend" | "algo" | "formal" | "audit" | "product" | "ops" | "frontend" | "data";

function packFor(tpl: ResumeTemplateMeta): Pack {
  switch (tpl.id) {
    case "campus-tech":
      return "backend";
    case "campus-timeline":
      return "algo";
    case "campus-classic":
      return "formal";
    case "campus-serif":
      return "audit";
    case "campus-banner":
      return "product";
    case "campus-card":
      return "ops";
    case "campus-sidebar":
      return "frontend";
    case "campus-split":
      return "data";
    default:
      return "backend";
  }
}

type SampleBody = Omit<Resume, "id" | "profileId" | "templateId" | "version" | "theme" | "createdAt" | "updatedAt">;

const SECTIONS: SampleBody["sections"] = [
  { key: "education", visible: true },
  { key: "internships", visible: true },
  { key: "projects", visible: true },
  { key: "skills", visible: true },
  { key: "campus", visible: true },
  { key: "awards", visible: true },
  { key: "summary", visible: true },
];

const FORMAL_SECTIONS: SampleBody["sections"] = [
  { key: "education", visible: true },
  { key: "internships", visible: true },
  { key: "campus", visible: true },
  { key: "projects", visible: true },
  { key: "skills", visible: true },
  { key: "awards", visible: true },
  { key: "summary", visible: true },
];

function person(
  extra: Partial<Resume["basics"]> & { summary: string; wechat: string; location: string },
): Resume["basics"] {
  return {
    name: "张三",
    phone: "13800001111",
    email: "zhangsan@example.com",
    github: "",
    website: "",
    photo: SAMPLE_PHOTO,
    ...extra,
  };
}

/** 互联网研发 · 后端：两段量化实习 + 可深挖项目。 */
function backendBody(): SampleBody {
  return {
    targetRole: "后端开发",
    basics: person({
      wechat: "zhangsan_dev",
      github: "zhangsan",
      website: "https://github.com/zhangsan",
      location: "上海",
      summary:
        "计算机专业 2026 届，两段业务后端实习。能独立交付中等规模接口与数据任务：订单查询 P99 从 420ms 降到 160ms，配置中心覆盖 4 条业务线。熟悉 Java / Go、MySQL / Redis / Kafka，习惯补日志、指标和单测，不写无法面试深挖的经历。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "计算机科学与技术",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.72 / 4.00（专业前 15%）｜操作系统 92 / 计算机网络 90 / 数据库 93 / 算法设计 91｜CET-6 568｜课程设计：基于 Raft 的 KV 存储",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "星海科技",
        title: "后端开发实习",
        period: "2025.07 – 2025.09",
        tech: "Java 17 · Spring Boot 3 · MySQL 8 · Redis · Kafka · SkyWalking",
        bullets: [
          "负责交易查询链路改造：4 表联查改为主键查询 + Redis 缓存（延迟双删），P99 从 420ms 降到 160ms，大促峰值 QPS 从 1.2k 提到约 2.5k",
          "补齐 TraceId、黄金指标与慢 SQL 告警，超时工单周均 22→14（约 -35%），oncall 平均耗时缩短一半",
          "补模块单测与回归用例，行覆盖 51%→82%；两次评审拦住越权查询，避免把内部订单接口直接暴露给 C 端",
        ],
      },
      {
        id: nid("job-2"),
        org: "澄数据",
        title: "服务端开发实习",
        period: "2024.07 – 2024.09",
        tech: "Go · PostgreSQL · gRPC · Redis",
        bullets: [
          "实现内部配置下发：gRPC 拉取 + 版本号灰度 / 一键回滚，覆盖支付、风控、运营 4 条业务线，配置错误平均修复从 40 分钟降到 5 分钟内",
          "编写同步任务与失败重试（指数退避 + 死信），周失败率 3.1%→0.4%，避免脏数据进入报表",
          "输出接口约定与 oncall 手册，后续两名实习生按文档独立加字段，未再出现字段名冲突",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "校招网申助手",
        title: "全栈 / 负责人",
        period: "2025.03 – 至今",
        tech: "TypeScript · Vue 3 · Hono · SQLite · Zod",
        bullets: [
          "本机优先的校招档案 + 一页纸简历：8 套完整模板实时预览，打印另存 PDF，文件名「姓名-方向-vN」",
          "Zod 统一契约：档案只回写身份与教育，实习/项目留在简历版本；提交必须人手确认，不做验证码和 Cookie 导出",
        ],
      },
      {
        id: nid("proj-2"),
        org: "轻量分布式评测",
        title: "后端",
        period: "2024.09 – 2025.01",
        tech: "Go · Redis · Docker · Linux cgroup",
        bullets: [
          "设计判题队列与沙箱调度：Redis 延时队列 + worker 抢占，单机稳定 50 并发，超时任务可回收，避免评测机挂死",
          "提供提交 / 评测 / 榜单 API，课程使用 200+ 人；补请求日志后定位到 3 起因样例文件未挂载导致的误判",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "计算机协会",
        title: "技术部部长",
        period: "2023.09 – 2025.06",
        tech: "Vue · 报名系统",
        bullets: [
          "组织 6 场校内分享 + 1 场黑客马拉松，单场最高 120 人；把报名从表格改成系统后，现场签到从 40 分钟压到 10 分钟内",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "语言 / 框架", items: "Java / Go / TypeScript · Spring Boot / Vue 3 / Hono" },
      { id: nid("skill-2"), label: "数据 / 中间件", items: "MySQL / PostgreSQL / Redis / Kafka · 索引与慢查询" },
      { id: nid("skill-3"), label: "工程", items: "Linux / Git / Docker / 单测 / 日志指标 / SkyWalking" },
      { id: nid("skill-4"), label: "英语", items: "CET-6 568 · 可阅读英文文档，能写接口说明" },
    ],
    skills: ["Java", "Go", "TypeScript", "Spring Boot", "MySQL", "Redis", "Kafka", "Docker"],
    awards: [
      "2025 全国大学生程序设计竞赛 铜奖（团队 3 人，负责图论与实现）",
      "2024 校级一等奖学金（专业前 10%）",
    ],
    sections: SECTIONS,
  };
}

/** 研发时间轴 · 算法：推荐 / 特征 / 评测，经历用时间串起来。 */
function algoBody(): SampleBody {
  return {
    targetRole: "算法工程师",
    basics: person({
      wechat: "zhangsan_ml",
      github: "zhangsan-ml",
      website: "https://github.com/zhangsan-ml",
      location: "北京",
      summary:
        "人工智能专业 2026 届，推荐与 CV 实习各一段。能独立做特征、离线评测和一小段在线推理：首页 CTR +4.2%，检测 mAP 0.71→0.78。熟悉 PyTorch / SQL / 特征平台，数字都能对照实验记录，不写「熟悉深度学习」。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "人工智能",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.81 / 4.00（专业前 8%）｜机器学习 95 / 深度学习 94 / 概率统计 92 / 最优化 90｜CET-6 612｜毕业论文：多任务推荐中的冷启动",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "云栖互娱推荐组",
        title: "算法实习",
        period: "2025.06 – 2025.09",
        tech: "Python · PyTorch · Hive · Redis · Airflow",
        bullets: [
          "负责首页 Feed 冷启动：补 12 维内容侧特征 + 多任务（CTR/时长），离线 AUC +1.8pt，线上 CTR 相对 +4.2%（两周 AA 校准后上线）",
          "把日更特征从手工 SQL 迁到 Airflow，失败可重跑；特征延迟从 T+2 收到 T+1 上午 9 点前",
          "写评测手册（样本切片、置信区间），拦住一次「全体用户提升、新用户实际下降」的错误上线",
        ],
      },
      {
        id: nid("job-2"),
        org: "澄视科技",
        title: "视觉算法实习",
        period: "2024.07 – 2024.09",
        tech: "PyTorch · OpenCV · ONNX · TensorRT",
        bullets: [
          "工位违章检测：YOLOv8 蒸馏到学生模型，mAP@0.5 从 0.71 到 0.78，TensorRT 后单卡 42 FPS，满足产线 25 FPS 门槛",
          "难例挖掘：把漏检框回灌训练，夜班误报周均 18→7；输出标注规范，质检按规范返工率下降",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "课程作业查重与聚类",
        title: "算法 / 负责人",
        period: "2025.02 – 2025.05",
        tech: "Python · sentence-transformers · Faiss",
        bullets: [
          "用句向量 + Faiss 对 3 学期 1.2 万份报告做近重复检索，教师复核确认 37 组高度相似，误报经阈值调到 <5%",
          "提供网页标注与导出，课程组沿用；代码和实验记录开源，方便下一届复现",
        ],
      },
      {
        id: nid("proj-2"),
        org: "轻量推荐 Demo",
        title: "个人项目",
        period: "2024.10 – 2025.01",
        tech: "PyTorch · FastAPI · Redis",
        bullets: [
          "MovieLens-1M 上复现两塔 + 难负采样，HR@10 相对随机召回 +18pt；推理接口 P99 < 30ms（本机）",
          "写清数据划分与泄漏检查，面试时能对着仓库讲负采样和评估为什么不能用未来点击",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "机器学习兴趣小组",
        title: "组织者",
        period: "2023.09 – 2025.06",
        tech: "",
        bullets: [
          "双周论文分享 18 场，固定 12–20 人；整理 40 篇笔记，新人按清单两周能跑通第一份实验",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "模型", items: "PyTorch / sklearn · 推荐两塔 / 多任务 · YOLO 检测与蒸馏" },
      { id: nid("skill-2"), label: "数据", items: "SQL / Hive · 特征平台与样本切片 · 离线 AUC 与线上 AA" },
      { id: nid("skill-3"), label: "工程", items: "Airflow / FastAPI / Redis · ONNX / TensorRT 基础" },
      { id: nid("skill-4"), label: "英语", items: "CET-6 612 · 能精读英文论文方法部分" },
    ],
    skills: ["PyTorch", "推荐", "SQL", "特征工程", "YOLO"],
    awards: [
      "2025 全国大学生数学建模竞赛 省级一等奖（负责建模与写作）",
      "2024 校级特等奖学金（专业前 5%）",
      "2024 校 ACM 银奖",
    ],
    sections: SECTIONS,
  };
}

/** 国企银行 · 管培：拜访纪要、材料、宣讲，不堆技术名词。 */
function formalBody(): SampleBody {
  return {
    targetRole: "管培生 / 综合管理",
    basics: person({
      wechat: "zhangsan_hr",
      location: "北京",
      summary:
        "人力资源管理专业 2026 届。银行对公实习与集团管培轮岗各一段，能独立完成客户拜访纪要、入职材料与校招宣讲场次执行。书面表达清楚，习惯用数据和节点说话，不写空洞的「沟通能力强」。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "人力资源管理",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.68 / 4.00（专业前 12%）｜组织行为学 91 / 劳动法学 90 / 薪酬管理 88｜CET-6 573｜辅修：财务管理",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "青禾银行总行营业部",
        title: "对公客户经理助理",
        period: "2025.07 – 2025.09",
        tech: "Excel · 信贷材料 · 客户拜访",
        bullets: [
          "跟随客户经理完成 18 家中小企业拜访，整理需求纪要与竞品对照表，其中 3 家在实习期内进入尽调名单",
          "核对授信材料 40+ 份（营业执照、财报、担保），缺件率从首周 28% 降到第 8 周 6%；行业敞口周报被小组沿用为模板",
        ],
      },
      {
        id: nid("job-2"),
        org: "华津集团人力资源部",
        title: "校招 / 管培助理",
        period: "2024.07 – 2024.09",
        tech: "北森 · Excel · 宣讲执行",
        bullets: [
          "协助 5 场校园宣讲：场地、物料、签到与问答记录，单场到场 80–150 人，签到准确率 99%",
          "初筛网申 300+ 份并打标，误筛投诉为 0；跟进 26 名拟录用学生三方/体检，节点延误从 7 人降到 1 人",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "校招流程调研",
        title: "课题负责人",
        period: "2025.03 – 2025.06",
        tech: "问卷星 · Excel · 访谈",
        bullets: [
          "访谈 16 名已拿 offer 的学长与 3 名企业 HR，归纳网申被刷的 8 类原因（照片、时间线、空泛描述等）",
          "问卷回收 214 份有效，写出 20 页报告，被学院就业中心放进 2026 届求职手册附录",
        ],
      },
      {
        id: nid("proj-2"),
        org: "学院奖学金评审辅助表",
        title: "设计 / 维护",
        period: "2024.09 – 2024.12",
        tech: "Excel · 数据校验",
        bullets: [
          "把纸质打分改成带校验的评分表（绩点、科研、社会工作分项），评审会从 3 小时压到 1.5 小时",
          "公示期异议从上年 6 条降到 1 条，且可回溯每一项分数来源",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "学院学生会",
        title: "学习部部长",
        period: "2023.09 – 2025.06",
        tech: "",
        bullets: [
          "学业预警约谈与朋辈辅导：对接 40 名预警同学，学期内解除预警 28 人；组织 4 场考研/保研经验会，累计 260 人次，满意度 4.6/5",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "办公", items: "Word / Excel（透视表、校验）/ PPT · 北森 ATS 操作" },
      { id: nid("skill-2"), label: "业务", items: "网申初筛 · 宣讲执行 · 客户拜访纪要 · 材料完整性核对" },
      { id: nid("skill-3"), label: "语言", items: "普通话二甲 · CET-6 573 · 能独立写会议纪要与周报" },
    ],
    skills: ["Excel", "PPT", "网申初筛", "宣讲执行", "CET-6"],
    awards: [
      "2025 国家励志奖学金",
      "2024 校级一等奖学金（专业前 10%）",
      "2024 优秀学生干部",
    ],
    sections: FORMAL_SECTIONS,
  };
}

/** 学术正式 · 审计：底稿、抽样、函证，适合打印后投递事务所 / 研究所。 */
function auditBody(): SampleBody {
  return {
    targetRole: "审计助理",
    basics: person({
      wechat: "zhangsan_cpa",
      location: "上海",
      summary:
        "会计学 2026 届，拟参加 2026 年 CPA 专业阶段。事务所年审与企业内部审计各一段，能独立做存货监盘底稿、往来函证跟进与费用抽样。数字来自底稿，不写「细心负责」。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "会计学",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.74 / 4.00（专业前 10%）｜审计学 93 / 财务会计 92 / 财务管理 90 / 税法 89｜CET-6 580｜CPA 会计、税法已过（2025）",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "澄正会计师事务所",
        title: "审计实习（年审）",
        period: "2025.01 – 2025.03",
        tech: "Excel · 底稿 · 函证",
        bullets: [
          "参与 2 家制造业年审：独立完成存货监盘底稿（3 个仓库），差异 1.2% 已调节；抽盘覆盖金额约占存货 38%",
          "跟进应收账款函证 46 封，回函率 71%→补替代测试 12 笔，未再出现「函证未跟完就出报告」",
          "费用抽样 80 笔，发现 3 笔跨期，调整分录金额合计 27 万，经理复核一次通过",
        ],
      },
      {
        id: nid("job-2"),
        org: "华津集团审计部",
        title: "内审助理",
        period: "2024.07 – 2024.09",
        tech: "Excel · 访谈提纲",
        bullets: [
          "费用报销专项：抽 120 张单据，归纳 4 类不合规；跟 6 个部门访谈，把口头规定改成可抽查清单，报告被采纳 3 条制度补丁",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "课程：模拟合并报表",
        title: "小组长",
        period: "2025.03 – 2025.06",
        tech: "Excel · 合并抵消",
        bullets: [
          "带 4 人完成母子公司内部交易抵消与少数股东权益，工作底稿可按分录追溯；课程评分 94",
          "把抵消分录做成带校验的表，组员填错会标红，答辩时老师按表提问均能对上",
        ],
      },
      {
        id: nid("proj-2"),
        org: "学院财务制度梳理",
        title: "执笔",
        period: "2024.10 – 2024.12",
        tech: "访谈 · Word",
        bullets: [
          "对照旧制度与 12 份报销案例，写出 8 页修订建议（发票、审批链、学生活动垫资），学生会采纳 5 条",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "会计协会",
        title: "学术部副部长",
        period: "2023.09 – 2025.06",
        tech: "",
        bullets: [
          "组织 CPA 经验分享 5 场，平均到场 70 人；整理科目时间表，协会问卷「对备考有帮助」占比 81%",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "专业", items: "年审底稿 · 函证与替代测试 · 费用抽样 · 存货监盘" },
      { id: nid("skill-2"), label: "工具", items: "Excel（透视、查找、校验）/ Word 底稿 · 用友 / 金蝶基础" },
      { id: nid("skill-3"), label: "资格 / 语言", items: "CPA 会计、税法已过 · CET-6 580 · 能写审计说明段" },
    ],
    skills: ["审计底稿", "Excel", "函证", "CPA"],
    awards: [
      "2025 校级一等奖学金（专业前 10%）",
      "2024 优秀学生干部",
    ],
    sections: FORMAL_SECTIONS,
  };
}

/** 产品色带 · 产品经理：留存、转化、PRD。 */
function productBody(): SampleBody {
  return {
    targetRole: "产品经理",
    basics: person({
      wechat: "zhangsan_pm",
      website: "https://zhangsan.notion.site",
      location: "杭州",
      summary:
        "工业工程 2026 届，产品实习两段。独立写过 PRD、跟过 A/B 与需求评审，能把「功能」写成可验证的指标。实习期内把新用户次日留存从 18% 做到 24%，把校内活动报名从表格迁到产品后爽约率下降 40%。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "工业工程",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.65 / 4.00（专业前 18%）｜用户研究 90 / 数据分析 88 / 运筹学 87｜CET-6 551｜作品：校园二手交易小程序",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "云栖互娱",
        title: "产品经理实习（增长）",
        period: "2025.07 – 2025.09",
        tech: "Axure · SQL · 神策 · Figma",
        bullets: [
          "负责新手任务改版：把 7 步引导收成 3 步 + 可跳过，A/B 两周，新用户次日留存 18%→24%，注册到首次发布转化 +6pt",
          "周需求评审 12 个，砍掉 4 个无法验证的「体验优化」；输出需求文档模板，后续实习生按模板写，返工次数明显下降",
          "用 SQL 拉新用户路径，发现 31% 人卡在实名页，推动先浏览后认证，该步流失从 31% 降到 19%",
        ],
      },
      {
        id: nid("job-2"),
        org: "青禾在线教育",
        title: "产品助理",
        period: "2024.07 – 2024.09",
        tech: "墨刀 · Excel · 用户访谈",
        bullets: [
          "访谈 15 名付费学员，归纳续费理由与流失点，输出 8 页结论，被用于秋季续费话术",
          "跟进作业批改队列：从「老师手动领」改成按时段分配，平均批改时长 6h→3.5h，投诉工单周均 -40%",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "校园活动报名",
        title: "产品 / 全栈协作",
        period: "2025.02 – 2025.06",
        tech: "Figma · Vue 3 · 微信小程序",
        bullets: [
          "把社团报名从表格迁到小程序：报名、签到、候补，覆盖 12 个社团、学期 28 场活动",
          "候补自动递补后，现场空位从平均 11 个降到 3 个，爽约率下降约 40%",
        ],
      },
      {
        id: nid("proj-2"),
        org: "二手教材匹配",
        title: "负责人",
        period: "2024.03 – 2024.06",
        tech: "问卷 · 小程序",
        bullets: [
          "按课程码匹配买卖双方，上线首月 160 单；做信用分（成交 + 评价），一学期仅 2 起纠纷，均在 48 小时内调解",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "产品经理协会",
        title: "活动总监",
        period: "2023.09 – 2025.06",
        tech: "",
        bullets: [
          "策划 8 场「拆一份 PRD」工作坊，平均到场 45 人，会后交作业比例 70%；对接 3 名业界导师，学期问卷 NPS 62",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "产品", items: "PRD / 用户故事 / 需求评审 · Axure / 墨刀 / Figma" },
      { id: nid("skill-2"), label: "数据", items: "SQL 基础 · 神策 / 问卷星 · A/B 读结果，不编造提升" },
      { id: nid("skill-3"), label: "协作", items: "与设计、研发对排期 · 周报与评审纪要" },
      { id: nid("skill-4"), label: "英语", items: "CET-6 551 · 能读英文帮助文档" },
    ],
    skills: ["PRD", "Axure", "SQL", "用户访谈", "A/B"],
    awards: [
      "2025 全国大学生电子商务「创新、创意及创业」挑战赛 省级二等奖",
      "2024 校级优秀学生干部",
      "2024 校奖学金 二等奖",
    ],
    sections: SECTIONS,
  };
}

/** 模块卡片 · 用户运营：活动转化、社群、内容。 */
function opsBody(): SampleBody {
  return {
    targetRole: "用户运营",
    basics: person({
      wechat: "zhangsan_ops",
      website: "",
      location: "广州",
      summary:
        "市场营销 2026 届，内容与活动运营实习各一段。能独立排期、算转化、写复盘：一场拉新活动 ROI 1:4.2，社群 30 日留存 22%→31%。不写「善于沟通」，数字都能对上后台。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "市场营销",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.58 / 4.00（专业前 20%）｜消费者行为 90 / 市场调研 88 / 新媒体运营 92｜CET-6 526｜作品：校园二手社群运营手册",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "木白出行",
        title: "用户运营实习",
        period: "2025.07 – 2025.09",
        tech: "企业微信 · 神策 · 问卷星",
        bullets: [
          "负责新用户礼包改版：任务从 6 个收到 3 个，核销率 19%→34%；30 日留存 22%→31%（同周对比，排除大促周）",
          "周更 3 条社群话术 A/B，高打开的一条复购点击 +2.1pt，沉淀进话术库供兼职使用",
          "客服高频问题 Top10 做成自动回复，相关工单周均 -28%，把人力腾给投诉升级",
        ],
      },
      {
        id: nid("job-2"),
        org: "青禾在线教育",
        title: "活动运营实习",
        period: "2024.07 – 2024.09",
        tech: "Excel · 海报 · 投放复盘",
        bullets: [
          "执行「暑假试听」：渠道 4 个，落地页转化 3.6%→5.1%（改首屏承诺和表单字段），获客成本下降约 18%",
          "场次签到与候补：空位从平均 9 人降到 3 人；写 6 页复盘（渠道、话术、到场），秋季活动直接复用框架",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "学院二手教材社群",
        title: "运营负责人",
        period: "2024.09 – 2025.06",
        tech: "微信群 · 小程序",
        bullets: [
          "从 1 个群扩到 4 个年级群共 1800 人，学期成交约 420 单；制定发布格式后，广告贴从日均 12 条降到 2 条",
          "信用分（成交 + 评价）上线后纠纷 3 起，48 小时内调解，无到学院投诉",
        ],
      },
      {
        id: nid("proj-2"),
        org: "新生开学指南",
        title: "内容策划",
        period: "2024.07 – 2024.09",
        tech: "公众号 · 问卷",
        bullets: [
          "写 8 篇「报道当天 / 选课 / 银行卡」指南，单篇最高阅读 1.2 万；问卷 86% 表示「少问学长至少 1 个问题」",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "青年志愿者协会",
        title: "宣传部部长",
        period: "2023.09 – 2025.06",
        tech: "",
        bullets: [
          "学期 11 场志愿招募，报名页转化约 40%；把「到场即走」改成任务卡后，完课证明缺交从 15% 降到 4%",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "运营", items: "活动排期 / 社群话术 / 核销与留存 · 复盘模板" },
      { id: nid("skill-2"), label: "内容 / 设计", items: "公众号 · 简易海报 · 投放落地页首屏改写" },
      { id: nid("skill-3"), label: "数据", items: "Excel · 神策基础 · 问卷回收与渠道对比" },
      { id: nid("skill-4"), label: "英语", items: "CET-6 526 · 能读后台英文帮助" },
    ],
    skills: ["用户运营", "活动运营", "Excel", "社群", "复盘"],
    awards: [
      "2025 校级社会工作奖学金",
      "2024 院级优秀志愿者",
      "2023 学院宣传策划大赛 二等奖",
    ],
    sections: SECTIONS,
  };
}

/** 左侧信息栏 · 前端：列表性能、小程序完成率。 */
function frontendBody(): SampleBody {
  return {
    targetRole: "前端开发",
    basics: person({
      wechat: "zhangsan_fe",
      github: "zhangsan",
      website: "https://zhangsan.dev",
      location: "深圳",
      summary:
        "软件工程 2026 届，前端实习两段。能独立做中后台页与小程序：把列表页 LCP 从 3.8s 降到 1.9s，把报名流程从 5 步收到 2 步。熟悉 Vue 3 / TypeScript / 小程序，注重可访问性和回归，不堆没上过线的 Demo。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "软件工程",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.70 / 4.00（专业前 16%）｜Web 前端 94 / 计算机网络 89 / 软件工程 90｜CET-6 540｜毕业设计：低代码表单渲染",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "澜图网络",
        title: "前端开发实习",
        period: "2025.07 – 2025.09",
        tech: "Vue 3 · TypeScript · Vite · Pinia · Element Plus",
        bullets: [
          "负责商家后台订单列表：虚拟滚动 + 列设置缓存，1 万行内滚动不卡，LCP 3.8s→1.9s，客服再未报「点开白屏」",
          "抽 6 个表格筛选到公共组件，3 个页面复用；Code Review 拦住 2 处未转义的富文本",
          "补 E2E 关键路径（登录-筛选-导出），发版前拦下一次导出文件名为空的缺陷",
        ],
      },
      {
        id: nid("job-2"),
        org: "木白出行",
        title: "小程序开发实习",
        period: "2024.07 – 2024.09",
        tech: "微信小程序 · TypeScript · 云开发",
        bullets: [
          "改预约流程：5 步收到「选时间 + 确认」，完成率 46%→71%，客服咨询「下一步点哪」明显减少",
          "处理弱网：请求排队与失败重试，高峰期预约失败率 8%→2%",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "低代码表单渲染",
        title: "前端 / 毕业设计",
        period: "2025.09 – 2026.03",
        tech: "Vue 3 · JSON Schema · Vite",
        bullets: [
          "用 JSON Schema 渲染问卷 / 报名表，支持 12 种控件与联动显示，学院 3 个社团改用后不再每次找人改代码",
          "校验与错误定位写进组件，用户提交失败可跳到第一处错误，测试集 40 份表单全部可复现",
        ],
      },
      {
        id: nid("proj-2"),
        org: "课程作业互评",
        title: "前端",
        period: "2024.10 – 2025.01",
        tech: "Vue 3 · Tailwind · REST",
        bullets: [
          "匿名互评 + 教师复核，课程 90 人使用；把「打分但没评语」拦截在提交前，有效评语率 62%→88%",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "互联网协会",
        title: "前端组组长",
        period: "2023.09 – 2025.06",
        tech: "Vue",
        bullets: [
          "带 6 人维护协会官网与活动页，学期 11 次更新无事故；新人 onboarding 文档把上手从 2 周缩到 4 天",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "语言 / 框架", items: "TypeScript / JavaScript · Vue 3 / 小程序 / 少量 React" },
      { id: nid("skill-2"), label: "工程", items: "Vite / Pinia / Git · 组件抽象 / E2E / Lighthouse" },
      { id: nid("skill-3"), label: "协作", items: "对设计稿还原 · 和后端对接口 · Code Review" },
      { id: nid("skill-4"), label: "英语", items: "CET-6 540 · 能读 MDN 与组件库文档" },
    ],
    skills: ["Vue 3", "TypeScript", "小程序", "Vite", "Pinia"],
    awards: [
      "2025 中国大学生计算机设计大赛 省级三等奖",
      "2024 校级三好学生",
      "2024 校奖学金 二等奖",
    ],
    sections: SECTIONS,
  };
}

/** 左右分栏 · 数据分析：SQL、看板、实验。 */
function dataBody(): SampleBody {
  return {
    targetRole: "数据分析",
    basics: person({
      wechat: "zhangsan_bi",
      github: "zhangsan-data",
      website: "",
      location: "杭州",
      summary:
        "统计学 2026 届，业务分析与数据仓库实习各一段。能独立取数、出周报、搭看板：把投放 ROI 看板从 T+2 收到当天 18 点，把「感觉转化差了」变成可切片的漏斗。SQL / Excel / 可视化写在经历里，不单列工具名词。",
    }),
    education: [
      {
        id: nid("edu-1"),
        school: "某某大学",
        major: "统计学",
        degree: "本科",
        period: "2022.09 – 2026.06",
        detail:
          "GPA 3.76 / 4.00（专业前 12%）｜回归分析 94 / 抽样调查 91 / 数据库 90 / 机器学习 88｜CET-6 598｜毕设：校园消费异常检测",
      },
    ],
    internships: [
      {
        id: nid("job-1"),
        org: "云栖互娱数据组",
        title: "数据分析实习",
        period: "2025.07 – 2025.09",
        tech: "SQL · Hive · Tableau · Python",
        bullets: [
          "负责投放周报：渠道 × 素材 × 新老客切片，发现 1 个渠道 ROI 连续 3 周 < 0.7，停投后整体获客成本 -11%",
          "把注册→首活漏斗做成可筛选看板，运营自助查数，取数工单周均 18→6",
          "A/B 读结果：补样本量与置信区间，拦住一次「只看点估计就全量」的实验",
        ],
      },
      {
        id: nid("job-2"),
        org: "青禾零售",
        title: "业务分析实习",
        period: "2024.07 – 2024.09",
        tech: "Excel · SQL · 看板",
        bullets: [
          "门店促销复盘：对照 12 家店销量与库存，标出 3 家「折扣深但连带率低」，下一档活动不再跟进同款折扣",
          "日报从手工粘贴改成查询 + 透视，出品时间 10:30→9:15，错数投诉当季为 0",
        ],
      },
    ],
    projects: [
      {
        id: nid("proj-1"),
        org: "校园卡消费异常检测",
        title: "毕设 / 分析",
        period: "2025.09 – 2026.03",
        tech: "Python · SQL · 孤立森林",
        bullets: [
          "用一学期脱敏流水做异常检测，精确率 0.81（人工抽检 200 条）；食堂窗口错账 2 起被后勤核实",
          "输出特征说明与误报案例，避免把「考试周集中消费」当成异常",
        ],
      },
      {
        id: nid("proj-2"),
        org: "课程评教文本分析",
        title: "课程项目",
        period: "2025.03 – 2025.06",
        tech: "Python · 词云 / 主题",
        bullets: [
          "对 8 门课 2400 条评教做主题聚类，归纳「作业量 / 节奏 / 实验环境」三类高频，报告交给教学办作参考",
        ],
      },
    ],
    campus: [
      {
        id: nid("campus-1"),
        org: "统计协会",
        title: "调研部部长",
        period: "2023.09 – 2025.06",
        tech: "问卷星 · Excel",
        bullets: [
          "主持 3 次全校问卷（选课、食堂、就业），有效样本均 > 400；把交叉表做成一页结论，避免只贴百分比",
        ],
      },
    ],
    skillGroups: [
      { id: nid("skill-1"), label: "取数", items: "SQL / Hive · 窗口函数与去重 · 漏斗与留存口径" },
      { id: nid("skill-2"), label: "分析", items: "Excel 透视 / 检验基础 · Python pandas · A/B 读结果" },
      { id: nid("skill-3"), label: "可视化", items: "Tableau / 简易看板 · 周报结构（结论先写）" },
      { id: nid("skill-4"), label: "英语", items: "CET-6 598 · 能读英文指标定义" },
    ],
    skills: ["SQL", "Excel", "Tableau", "Python", "A/B"],
    awards: [
      "2025 全国大学生统计建模大赛 省级二等奖",
      "2024 校级一等奖学金（专业前 10%）",
      "2024 优秀学生干部",
    ],
    sections: SECTIONS,
  };
}

function bodyFor(tpl: ResumeTemplateMeta): SampleBody {
  switch (packFor(tpl)) {
    case "formal":
      return formalBody();
    case "audit":
      return auditBody();
    case "product":
      return productBody();
    case "ops":
      return opsBody();
    case "frontend":
      return frontendBody();
    case "data":
      return dataBody();
    case "algo":
      return algoBody();
    default:
      return backendBody();
  }
}

function isFormalPack(pack: Pack) {
  return pack === "formal" || pack === "audit";
}

/** 按模板受众给完整校招范文：教育、两段实习、两个项目、技能分组、校园、奖项、评价。 */
export function buildCompleteSampleResume(
  tpl: ResumeTemplateMeta,
  ids: CompleteSampleIds,
): Resume {
  const pack = packFor(tpl);
  const body = bodyFor(tpl);
  return {
    ...body,
    id: ids.id,
    profileId: ids.profileId,
    templateId: tpl.id,
    version: ids.version ?? 0,
    theme: {
      color: tpl.color,
      density: isFormalPack(pack) ? "normal" : "compact",
      fontSizePt: isFormalPack(pack) ? 10.5 : 10,
      showPhoto: tpl.showPhoto,
    },
    createdAt: ids.createdAt,
    updatedAt: ids.updatedAt,
  };
}
