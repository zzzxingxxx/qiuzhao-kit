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
</script>

<template>
  <article class="paper" :class="'layout-' + layout" :style="paperStyle">
    <!-- 左侧信息栏：照片 / 联系方式 / 技能 -->
    <template v-if="layout === 'sidebar'">
      <aside class="rail">
        <img v-if="showPhoto" class="photo" :src="resume.basics.photo" alt="证件照" />
        <div v-else class="photo-ph">{{ (resume.basics.name || "姓").slice(0, 1) }}</div>
        <h1>{{ resume.basics.name || "姓名" }}</h1>
        <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
        <p class="rail-label">联系方式</p>
        <p v-for="line in contacts" :key="line" class="rail-line">{{ line }}</p>
        <template v-if="skillGroups.length || resume.skills.some((s) => s.trim())">
          <p class="rail-label">专业技能</p>
          <p v-for="group in skillGroups" :key="group.id" class="rail-skill">
            <strong v-if="group.label.trim()">{{ group.label }}</strong>
            {{ group.items }}
          </p>
          <p v-if="!skillGroups.length" class="rail-skill">
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
        <h1>{{ resume.basics.name || "姓名" }}</h1>
        <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
        <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
      </header>
      <ResumeSections :resume="resume" />
    </template>

    <!-- 技术简洁：单栏左对齐 -->
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
      <ResumeSections :resume="resume" />
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
  border-bottom: 1.5px solid #222;
  min-height: 22mm;
}
.layout-classic h1 {
  letter-spacing: 0.28em;
  font-size: 22pt;
}
.layout-classic .role {
  color: #333;
  font-weight: 500;
  margin: 4px 0 0;
}
.layout-classic .contact {
  color: #333;
}
.layout-classic .classic-photo {
  position: absolute;
  top: 0;
  right: 0;
}
.layout-classic :deep(h2) {
  color: #111;
  border-bottom: 1px solid #111;
  justify-content: center;
  letter-spacing: 0.2em;
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
  align-items: center;
  gap: 14px;
  background: var(--resume-color, #1d4ed8);
  color: #fff;
  margin: -14mm -14mm 10mm;
  padding: 12mm 14mm 10mm;
}
.banner h1,
.banner .role,
.banner .contact {
  color: #fff;
}
.banner .role {
  opacity: 0.92;
  font-weight: 500;
}
.banner .contact {
  opacity: 0.9;
}
.banner .photo {
  border: 2px solid rgba(255, 255, 255, 0.7);
}
.layout-banner :deep(h2) {
  border-bottom-color: #e5e7eb;
}
.layout-banner :deep(h2::before) {
  width: 8px;
  height: 8px;
  border-radius: 1px;
}

.layout-sidebar {
  display: grid;
  grid-template-columns: 64mm 1fr;
}
.rail {
  background: var(--resume-color, #1f4e79);
  color: #fff;
  padding: 12mm 8mm;
  min-height: 297mm;
}
.rail h1 {
  color: #fff;
  font-size: 16pt;
  letter-spacing: 0.12em;
  margin-top: 8px;
}
.rail .role {
  color: rgba(255, 255, 255, 0.88);
  margin: 4px 0 10px;
  font-size: 10pt;
}
.rail .photo {
  width: 28mm;
  height: 36mm;
  display: block;
  margin: 0 auto 8px;
  border: 2px solid rgba(255, 255, 255, 0.55);
}
.photo-ph {
  width: 28mm;
  height: 28mm;
  margin: 0 auto 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16pt;
  font-weight: 700;
}
.rail-label {
  margin: 14px 0 6px;
  font-size: 9.5pt;
  letter-spacing: 0.14em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
  padding-bottom: 3px;
  font-weight: 700;
}
.rail-line,
.rail-skill {
  margin: 0 0 4px;
  font-size: 9pt;
  line-height: 1.4;
  word-break: break-all;
}
.rail-skill strong {
  display: block;
  opacity: 0.9;
  margin-bottom: 1px;
}
.main {
  padding: 12mm 10mm 12mm 8mm;
}
.layout-sidebar :deep(h2) {
  font-size: 11pt;
}
</style>
