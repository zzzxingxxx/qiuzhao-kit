<script setup lang="ts">
import { computed } from "vue";
import {
  RESUME_SECTION_LABELS,
  type Resume,
  type ResumeSectionKey,
} from "@qiuzhao/schema";

const props = withDefaults(
  defineProps<{
    resume: Resume;
    hideKeys?: ResumeSectionKey[];
    variant?: "default" | "timeline" | "card";
  }>(),
  { variant: "default" },
);

function visible(key: ResumeSectionKey) {
  if (props.hideKeys?.includes(key)) return false;
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

function rowClass(key: ResumeSectionKey) {
  if (props.variant === "timeline" && (key === "internships" || key === "projects" || key === "campus")) {
    return "row timeline-item";
  }
  return "row";
}
</script>

<template>
  <template v-for="key in orderedKeys" :key="key">
    <section v-if="key === 'summary'" class="block" :class="variant">
      <h2>{{ label("summary") }}</h2>
      <p class="summary">{{ resume.basics.summary }}</p>
    </section>

    <section v-else-if="key === 'education'" class="block" :class="variant">
      <h2>{{ label("education") }}</h2>
      <div v-for="item in resume.education.filter((x) => x.school.trim())" :key="item.id" :class="rowClass('education')">
        <div class="row-top">
          <strong>{{ item.school }}</strong>
          <span>{{ item.period }}</span>
        </div>
        <p>{{ [item.degree, item.major].filter(Boolean).join("  ·  ") }}</p>
        <p v-if="item.detail" class="muted">{{ item.detail }}</p>
      </div>
    </section>

    <section v-else-if="key === 'internships'" class="block" :class="variant">
      <h2>{{ label("internships") }}</h2>
      <div v-for="item in filledExp(resume.internships)" :key="item.id" :class="rowClass('internships')">
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

    <section v-else-if="key === 'projects'" class="block" :class="variant">
      <h2>{{ label("projects") }}</h2>
      <div v-for="item in filledExp(resume.projects)" :key="item.id" :class="rowClass('projects')">
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

    <section v-else-if="key === 'campus'" class="block" :class="variant">
      <h2>{{ label("campus") }}</h2>
      <div v-for="item in filledExp(resume.campus)" :key="item.id" :class="rowClass('campus')">
        <div class="row-top">
          <strong>{{ item.org }}{{ item.title ? "  ·  " + item.title : "" }}</strong>
          <span>{{ item.period }}</span>
        </div>
        <ul>
          <li v-for="(bullet, i) in item.bullets.filter((b) => b.trim())" :key="i">{{ bullet }}</li>
        </ul>
      </div>
    </section>

    <section v-else-if="key === 'skills'" class="block" :class="variant">
      <h2>{{ label("skills") }}</h2>
      <template v-if="resume.skillGroups.some((g) => g.items.trim())">
        <p v-for="group in resume.skillGroups.filter((g) => g.items.trim())" :key="group.id" class="skill">
          <strong v-if="group.label.trim()">{{ group.label }}：</strong>{{ group.items }}
        </p>
      </template>
      <p v-else>{{ resume.skills.filter((s) => s.trim()).join("  ·  ") }}</p>
    </section>

    <section v-else-if="key === 'awards'" class="block" :class="variant">
      <h2>{{ label("awards") }}</h2>
      <ul>
        <li v-for="(award, i) in resume.awards.filter((a) => a.trim())" :key="i">{{ award }}</li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
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

.timeline-item {
  position: relative;
  padding-left: 14px;
  margin-left: 4px;
  border-left: 2px solid color-mix(in srgb, var(--resume-color, #0f766e) 55%, #fff);
}
.timeline-item::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--resume-color, #0f766e);
  box-shadow: 0 0 0 2px #fff;
}

.block.card {
  border: 1px solid #e8e4ef;
  border-radius: 7px;
  padding: 7px 9px 6px;
  background: #fbfafd;
}
.block.card h2 {
  border-bottom: none;
  margin-bottom: 4px;
}
.block.card h2::before {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
</style>
