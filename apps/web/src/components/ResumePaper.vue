<script setup lang="ts">
import { computed } from "vue";
import { PAPER } from "@qiuzhao/pdf";
import { getResumeTemplate, type Resume } from "@qiuzhao/schema";
import ResumeSections from "./ResumeSections.vue";

const props = defineProps<{ resume: Resume }>();

const template = computed(() => getResumeTemplate(props.resume.templateId));
const layout = computed(() => template.value.layout);

const density = computed(() => {
  const mode = props.resume.theme.density;
  if (mode === "compact") return { lh: 1.32, gap: "5px" };
  if (mode === "relaxed") return { lh: 1.55, gap: "11px" };
  return { lh: 1.42, gap: "8px" };
});

const paperStyle = computed(() => ({
  width: `${PAPER.widthMm}mm`,
  height: `${PAPER.heightMm}mm`,
  padding: layout.value === "sidebar" ? "0" : `${PAPER.paddingMm}mm`,
  "--resume-color": props.resume.theme.color || template.value.color,
  "--resume-gap": density.value.gap,
  fontSize: `${props.resume.theme.fontSizePt || 10.5}pt`,
  lineHeight: String(density.value.lh),
}));

const contacts = computed(() => {
  const b = props.resume.basics;
  return [
    b.phone,
    b.email,
    b.wechat && `微信 ${b.wechat}`,
    b.github && (b.github.startsWith("http") ? b.github : `GitHub ${b.github}`),
    b.website,
    b.location,
  ].filter(Boolean) as string[];
});

const showPhoto = computed(
  () => props.resume.theme.showPhoto && Boolean(props.resume.basics.photo),
);

const skillGroups = computed(() =>
  props.resume.skillGroups.filter((g) => g.items.trim()),
);

const sectionVariant = computed(() => {
  if (layout.value === "timeline") return "timeline" as const;
  if (layout.value === "card") return "card" as const;
  return "default" as const;
});
</script>

<template>
  <article class="paper" :class="'layout-' + layout" :style="paperStyle">
    <!-- 左侧信息栏：照片 / 联系方式 / 技能 -->
    <template v-if="layout === 'sidebar'">
      <aside class="side-rail">
        <div class="side-brand">
          <img v-if="showPhoto" class="photo" :src="resume.basics.photo" alt="证件照" />
          <div v-else class="photo-ph">{{ (resume.basics.name || "姓").slice(0, 1) }}</div>
          <h1>{{ resume.basics.name || "姓名" }}</h1>
          <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
        </div>
        <p class="side-label">联系方式</p>
        <p v-for="line in contacts" :key="line" class="side-line">{{ line }}</p>
        <template v-if="skillGroups.length || resume.skills.some((s) => s.trim())">
          <p class="side-label">专业技能</p>
          <p v-for="group in skillGroups" :key="group.id" class="side-skill">
            <strong v-if="group.label.trim()">{{ group.label }}</strong>
            {{ group.items }}
          </p>
          <p v-if="!skillGroups.length" class="side-skill">
            {{ resume.skills.filter((s) => s.trim()).join(" / ") }}
          </p>
        </template>
      </aside>
      <div class="main">
        <ResumeSections :resume="resume" :hide-keys="['skills']" />
      </div>
    </template>

    <!-- 顶栏色块 -->
    <template v-else-if="layout === 'banner'">
      <header class="banner">
        <div class="identity">
          <div class="name-row">
            <h1>{{ resume.basics.name || "姓名" }}</h1>
            <span v-if="resume.targetRole" class="role">{{ resume.targetRole }}</span>
          </div>
          <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
        </div>
        <img v-if="showPhoto" class="photo" :src="resume.basics.photo" alt="证件照" />
      </header>
      <ResumeSections :resume="resume" />
    </template>

    <!-- 正式经典：居中姓名 -->
    <template v-else-if="layout === 'classic'">
      <header class="head classic-head">
        <img v-if="showPhoto" class="photo classic-photo" :src="resume.basics.photo" alt="证件照" />
        <p class="kicker">个人简历</p>
        <h1>{{ resume.basics.name || "姓名" }}</h1>
        <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
        <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
      </header>
      <ResumeSections :resume="resume" />
    </template>

    <!-- 学术衬线 -->
    <template v-else-if="layout === 'serif'">
      <header class="head serif-head">
        <img v-if="showPhoto" class="photo classic-photo" :src="resume.basics.photo" alt="证件照" />
        <p class="kicker">个人简历</p>
        <h1>{{ resume.basics.name || "姓名" }}</h1>
        <p class="serif-rule" />
        <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
        <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
      </header>
      <ResumeSections :resume="resume" />
    </template>

    <!-- 左右分栏 -->
    <template v-else-if="layout === 'split'">
      <div class="split-left">
        <img v-if="showPhoto" class="photo split-photo" :src="resume.basics.photo" alt="证件照" />
        <h1>{{ resume.basics.name || "姓名" }}</h1>
        <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
        <p v-for="line in contacts" :key="line" class="split-line">{{ line }}</p>
        <ResumeSections :resume="resume" :hide-keys="['internships', 'projects', 'campus', 'summary']" />
      </div>
      <div class="split-right">
        <ResumeSections :resume="resume" :hide-keys="['education', 'skills', 'awards']" />
      </div>
    </template>

    <!-- 模块卡片：白底姓名 + 卡片模块，不和色带模板共用大色块 -->
    <template v-else-if="layout === 'card'">
      <header class="head card-head">
        <div class="identity">
          <div class="name-row">
            <h1>{{ resume.basics.name || "姓名" }}</h1>
            <span v-if="resume.targetRole" class="role pill">{{ resume.targetRole }}</span>
          </div>
          <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
        </div>
        <img v-if="showPhoto" class="photo" :src="resume.basics.photo" alt="证件照" />
      </header>
      <ResumeSections :resume="resume" variant="card" />
    </template>

    <!-- 技术简洁 / 时间轴 -->
    <template v-else>
      <header class="head">
        <div class="identity">
          <div class="name-row">
            <h1>{{ resume.basics.name || "姓名" }}</h1>
            <span v-if="resume.targetRole" class="role">{{ resume.targetRole }}</span>
          </div>
          <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
        </div>
        <img v-if="showPhoto" class="photo" :src="resume.basics.photo" alt="证件照" />
      </header>
      <ResumeSections :resume="resume" :variant="sectionVariant" />
    </template>
  </article>
</template>

<style scoped>
.paper {
  box-sizing: border-box;
  background: #fff;
  color: #222;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(20, 30, 50, 0.12);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  border-bottom: 2px solid var(--resume-color, #1f4e79);
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.identity {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.name-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
h1 {
  margin: 0;
  font-size: 20pt;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #1a1a1a;
}
.role {
  color: var(--resume-color, #1f4e79);
  font-size: 11pt;
  font-weight: 600;
}
.contact {
  margin: 6px 0 0;
  font-size: 9.5pt;
  color: #444;
  word-break: break-all;
}
.photo {
  width: 22mm;
  height: 30mm;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
  background: #f3f3f3;
}

.layout-classic .classic-head {
  display: block;
  position: relative;
  text-align: center;
  border-bottom: none;
  min-height: 0;
  padding-bottom: 6px;
  margin-bottom: 6px;
}
.layout-classic .kicker {
  margin: 0;
  font-size: 8.5pt;
  letter-spacing: 0.55em;
  color: #666;
}
.layout-classic h1 {
  letter-spacing: 0.42em;
  font-size: 24pt;
  font-weight: 800;
}
.layout-classic .role {
  color: #333;
  font-weight: 500;
  margin: 4px 0 0;
  letter-spacing: 0.2em;
}
.layout-classic .contact {
  color: #333;
  margin-top: 6px;
}
.layout-classic .classic-photo,
.layout-serif .classic-photo {
  position: absolute;
  top: 0;
  right: 0;
  border: 1px solid #333;
}
.layout-classic :deep(h2) {
  background: #1a1a1a;
  color: #fff;
  border: none;
  justify-content: center;
  letter-spacing: 0.42em;
  padding: 1px 0 0;
  font-size: 10.5pt;
  font-weight: 600;
  margin-bottom: 4px;
}
.layout-classic :deep(h2::before) {
  display: none;
}

.layout-banner {
  overflow: hidden;
}
.banner {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  background: transparent;
  color: inherit;
  margin: -14mm -14mm 8mm;
  padding: 8mm 14mm 8mm;
  border-bottom: 4px solid var(--resume-color, #1d4ed8);
  position: relative;
}
.banner::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 7mm;
  background: var(--resume-color, #1d4ed8);
}
.banner .identity {
  padding-top: 8mm;
}
.banner h1 {
  color: #0f172a;
  font-size: 24pt;
  letter-spacing: 0.04em;
}
.banner .role {
  background: var(--resume-color, #1d4ed8);
  color: #fff;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 9.5pt;
  font-weight: 600;
}
.banner .contact {
  color: #475569;
}
.banner .photo {
  margin-top: 8mm;
  border: 1px solid #e2e8f0;
}
.layout-banner :deep(h2) {
  border-bottom: none;
  border-left: 4px solid var(--resume-color, #1d4ed8);
  padding-left: 8px;
  letter-spacing: 0.08em;
}
.layout-banner :deep(h2::before) {
  display: none;
}

.layout-tech {
  box-shadow: 0 10px 28px rgba(20, 30, 50, 0.12), inset 4px 0 0 var(--resume-color, #0f3d68);
}
.layout-tech .head {
  border-bottom: none;
  padding-bottom: 2px;
  margin-bottom: 6px;
}
.layout-tech h1 {
  font-size: 22pt;
  letter-spacing: 0.02em;
  font-weight: 800;
}
.layout-tech .role {
  font-size: 11pt;
  font-weight: 600;
}
.layout-tech .contact {
  color: #475569;
  border-bottom: 1.75px solid var(--resume-color, #0f3d68);
  padding-bottom: 8px;
}
.layout-tech :deep(h2) {
  letter-spacing: 0.18em;
  font-size: 10.5pt;
  border-bottom-width: 1.5px;
  padding-bottom: 2px;
}
.layout-tech :deep(h2::before) {
  display: none;
}

.layout-sidebar {
  display: grid;
  grid-template-columns: 62mm 1fr;
}
.side-rail {
  background: #eef3f8;
  color: #1e293b;
  padding: 0 8mm 12mm;
  min-height: 297mm;
  border-right: 1px solid #d5dee8;
}
.side-brand {
  background: var(--resume-color, #1d4a73);
  color: #fff;
  margin: 0 -8mm 10px;
  padding: 11mm 8mm 8mm;
  text-align: center;
}
.side-rail h1 {
  color: #fff;
  font-size: 16pt;
  letter-spacing: 0.08em;
  margin-top: 8px;
  text-align: center;
}
.side-rail .role {
  color: #e2eaf3;
  margin: 4px 0 0;
  font-size: 10pt;
  text-align: center;
}
.side-rail .photo {
  width: 32mm;
  height: 32mm;
  display: block;
  margin: 0 auto 8px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: none;
}
.photo-ph {
  width: 32mm;
  height: 32mm;
  margin: 0 auto 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16pt;
  font-weight: 700;
}
.side-label {
  margin: 14px 0 6px;
  font-size: 9pt;
  letter-spacing: 0.16em;
  border-bottom: 1.5px solid var(--resume-color, #1d4a73);
  padding-bottom: 3px;
  font-weight: 700;
  color: var(--resume-color, #1d4a73);
}
.side-line,
.side-skill {
  margin: 0 0 4px;
  font-size: 9pt;
  line-height: 1.4;
  word-break: break-all;
  color: #334155;
}
.side-skill strong {
  display: block;
  color: #0f172a;
  margin-bottom: 1px;
}
.main {
  padding: 12mm 10mm 12mm 8mm;
}
.layout-sidebar :deep(h2) {
  font-size: 11pt;
}

.layout-serif {
  font-family: "Songti SC", "STSong", "SimSun", "Noto Serif SC", "Times New Roman", serif;
}
.layout-serif .serif-head {
  display: block;
  position: relative;
  text-align: center;
  border-bottom: none;
  min-height: 0;
  margin-bottom: 4px;
  padding-bottom: 0;
}
.layout-serif .kicker {
  margin: 0;
  font-size: 8.5pt;
  letter-spacing: 0.62em;
  color: #666;
}
.layout-serif h1 {
  letter-spacing: 0.5em;
  font-size: 22pt;
  font-weight: 600;
}
.serif-rule {
  width: 48mm;
  height: 0;
  margin: 4px auto 4px;
  border-top: 1.5px solid #333;
  border-bottom: 0.5px solid #333;
  padding-top: 3px;
}
.layout-serif .role {
  color: #333;
  font-weight: 500;
  letter-spacing: 0.28em;
}
.layout-serif :deep(h2) {
  justify-content: center;
  letter-spacing: 0.42em;
  border-top: 1.25px solid #333;
  border-bottom: 1.25px solid #333;
  padding: 1px 0;
  color: #222;
  font-weight: 600;
}
.layout-serif :deep(.block) {
  margin-bottom: 5px;
}
.layout-serif :deep(h2::before) {
  display: none;
}

.layout-split {
  display: grid;
  grid-template-columns: 68mm 1fr;
  gap: 0;
  padding: 0;
}
.split-left {
  background: color-mix(in srgb, var(--resume-color, #1e3a5f) 8%, #fff);
  padding: 12mm 7mm 12mm 14mm;
  box-shadow: inset 4.5mm 0 0 var(--resume-color, #1e3a5f);
}
.split-right {
  padding: 12mm 12mm 12mm 8mm;
}
.split-left h1 {
  font-size: 16pt;
  letter-spacing: 0.12em;
  margin: 6px 0 2px;
  color: var(--resume-color, #1e3a5f);
}
.split-photo {
  width: 28mm;
  height: 28mm;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  margin-bottom: 8px;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #d5dee8;
}
.split-line {
  margin: 0 0 3px;
  font-size: 9pt;
  color: #444;
  word-break: break-all;
}
.layout-split :deep(h2) {
  font-size: 10.5pt;
}
.layout-split .split-left :deep(h2::before) {
  display: none;
}

.layout-card .card-head {
  border-bottom: none;
  background: color-mix(in srgb, var(--resume-color, #6d28d9) 8%, #fff);
  margin: -14mm -14mm 6mm;
  padding: 9mm 14mm 7mm;
  align-items: center;
}
.layout-card h1 {
  color: var(--resume-color, #6d28d9);
  letter-spacing: 0.02em;
  font-size: 22pt;
}
.layout-card .role.pill {
  background: var(--resume-color, #6d28d9);
  color: #fff;
  border-radius: 999px;
  padding: 1px 10px;
  font-size: 9.5pt;
}

.layout-timeline .head {
  border-bottom: none;
  padding-bottom: 4px;
  display: block;
}
.layout-timeline h1 {
  color: var(--resume-color, #0f766e);
  font-size: 22pt;
}
.layout-timeline .role {
  display: inline-block;
  border: 1px solid var(--resume-color, #0f766e);
  padding: 0 8px;
  border-radius: 2px;
  font-size: 9.5pt;
  margin-left: 8px;
}
.layout-timeline .contact {
  border-top: 2px solid var(--resume-color, #0f766e);
  padding-top: 6px;
  margin-top: 6px;
}
.layout-timeline :deep(h2::before) {
  display: none;
}
.layout-timeline :deep(h2) {
  letter-spacing: 0.14em;
  border-bottom-width: 2px;
  color: var(--resume-color, #0f766e);
}
</style>
