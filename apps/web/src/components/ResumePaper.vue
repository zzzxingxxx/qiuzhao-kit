<script setup lang="ts">
import { computed } from "vue";
import { PAPER } from "@qiuzhao/pdf";
import {
  RESUME_SECTION_LABELS,
  type Resume,
  type ResumeSectionKey,
} from "@qiuzhao/schema";

const props = defineProps<{ resume: Resume }>();

const density = computed(() => {
  const mode = props.resume.theme.density;
  if (mode === "compact") return { lh: 1.32, gap: "5px" };
  if (mode === "relaxed") return { lh: 1.55, gap: "11px" };
  return { lh: 1.42, gap: "8px" };
});

const paperStyle = computed(() => ({
  width: `${PAPER.widthMm}mm`,
  height: `${PAPER.heightMm}mm`,
  padding: `${PAPER.paddingMm}mm`,
  "--resume-color": props.resume.theme.color || "#1f4e79",
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

function visible(key: ResumeSectionKey) {
  return props.resume.sections.find((item) => item.key === key)?.visible !== false;
}

function filledExp(list: Resume["internships"]) {
  return list.filter(
    (item) => item.org.trim() || item.title.trim() || item.bullets.some((b) => b.trim()),
  );
}

function hasSection(key: ResumeSectionKey) {
  if (!visible(key)) return false;
  const r = props.resume;
  if (key === "summary") return Boolean(r.basics.summary.trim());
  if (key === "education") return r.education.some((item) => item.school.trim());
  if (key === "internships") return filledExp(r.internships).length > 0;
  if (key === "projects") return filledExp(r.projects).length > 0;
  if (key === "campus") return filledExp(r.campus).length > 0;
  if (key === "skills") {
    return r.skillGroups.some((g) => g.items.trim()) || r.skills.some((s) => s.trim());
  }
  if (key === "awards") return r.awards.some((item) => item.trim());
  return false;
}

const orderedKeys = computed(() =>
  props.resume.sections.map((item) => item.key).filter(hasSection),
);

function label(key: ResumeSectionKey) {
  return RESUME_SECTION_LABELS[key];
}
</script>

<template>
  <article class="paper" :style="paperStyle">
    <header class="head">
      <div class="identity">
        <div class="name-row">
          <h1>{{ resume.basics.name || "姓名" }}</h1>
          <span v-if="resume.targetRole" class="role">{{ resume.targetRole }}</span>
        </div>
        <p v-if="contacts.length" class="contact">{{ contacts.join("  ·  ") }}</p>
      </div>
      <img
        v-if="resume.theme.showPhoto && resume.basics.photo"
        class="photo"
        :src="resume.basics.photo"
        alt="证件照"
      />
    </header>

    <template v-for="key in orderedKeys" :key="key">
      <section v-if="key === 'summary'" class="block">
        <h2>{{ label("summary") }}</h2>
        <p class="summary">{{ resume.basics.summary }}</p>
      </section>

      <section v-else-if="key === 'education'" class="block">
        <h2>{{ label("education") }}</h2>
        <div v-for="item in resume.education.filter((x) => x.school.trim())" :key="item.id" class="row">
          <div class="row-top">
            <strong>{{ item.school }}</strong>
            <span>{{ item.period }}</span>
          </div>
          <p>{{ [item.degree, item.major].filter(Boolean).join("  ·  ") }}</p>
          <p v-if="item.detail" class="muted">{{ item.detail }}</p>
        </div>
      </section>

      <section v-else-if="key === 'internships'" class="block">
        <h2>{{ label("internships") }}</h2>
        <div v-for="item in filledExp(resume.internships)" :key="item.id" class="row">
          <div class="row-top">
            <strong>{{ item.org }}{{ item.title ? "  ·  " + item.title : "" }}</strong>
            <span>{{ item.period }}</span>
          </div>
          <p v-if="item.tech" class="muted">{{ item.tech }}</p>
          <ul>
            <li v-for="(bullet, i) in item.bullets.filter((b) => b.trim())" :key="i">{{ bullet }}</li>
          </ul>
        </div>
      </section>

      <section v-else-if="key === 'projects'" class="block">
        <h2>{{ label("projects") }}</h2>
        <div v-for="item in filledExp(resume.projects)" :key="item.id" class="row">
          <div class="row-top">
            <strong>{{ item.org }}{{ item.title ? "  ·  " + item.title : "" }}</strong>
            <span>{{ item.period }}</span>
          </div>
          <p v-if="item.tech" class="muted">{{ item.tech }}</p>
          <ul>
            <li v-for="(bullet, i) in item.bullets.filter((b) => b.trim())" :key="i">{{ bullet }}</li>
          </ul>
        </div>
      </section>

      <section v-else-if="key === 'campus'" class="block">
        <h2>{{ label("campus") }}</h2>
        <div v-for="item in filledExp(resume.campus)" :key="item.id" class="row">
          <div class="row-top">
            <strong>{{ item.org }}{{ item.title ? "  ·  " + item.title : "" }}</strong>
            <span>{{ item.period }}</span>
          </div>
          <ul>
            <li v-for="(bullet, i) in item.bullets.filter((b) => b.trim())" :key="i">{{ bullet }}</li>
          </ul>
        </div>
      </section>

      <section v-else-if="key === 'skills'" class="block">
        <h2>{{ label("skills") }}</h2>
        <template v-if="resume.skillGroups.some((g) => g.items.trim())">
          <p v-for="group in resume.skillGroups.filter((g) => g.items.trim())" :key="group.id" class="skill">
            <strong v-if="group.label.trim()">{{ group.label }}：</strong>{{ group.items }}
          </p>
        </template>
        <p v-else>{{ resume.skills.filter((s) => s.trim()).join("  ·  ") }}</p>
      </section>

      <section v-else-if="key === 'awards'" class="block">
        <h2>{{ label("awards") }}</h2>
        <ul>
          <li v-for="(award, i) in resume.awards.filter((a) => a.trim())" :key="i">{{ award }}</li>
        </ul>
      </section>
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
.block {
  margin-bottom: var(--resume-gap, 8px);
}
h2 {
  margin: 0 0 5px;
  font-size: 11.5pt;
  color: var(--resume-color, #1f4e79);
  border-bottom: 1px solid var(--resume-color, #1f4e79);
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
h2::before {
  content: "";
  width: 3.5px;
  height: 0.85em;
  background: var(--resume-color, #1f4e79);
  border-radius: 1px;
}
.row {
  margin-bottom: 5px;
}
.row-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.row p,
.summary,
.skill {
  margin: 1px 0;
}
.muted {
  color: #555;
  font-size: 0.95em;
}
ul {
  margin: 2px 0 0;
  padding-left: 1.15em;
}
li {
  margin: 0;
}
</style>
