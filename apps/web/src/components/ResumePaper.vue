<script setup lang="ts">
import { PAPER } from "@qiuzhao/pdf";
import type { Resume } from "@qiuzhao/schema";

defineProps<{ resume: Resume }>();

function joinContact(resume: Resume): string {
  return [resume.basics.phone, resume.basics.email].filter(Boolean).join("  ·  ");
}
</script>

<template>
  <article
    class="paper"
    :style="{
      width: PAPER.widthMm + 'mm',
      height: PAPER.heightMm + 'mm',
      padding: PAPER.paddingMm + 'mm',
    }"
  >
    <header class="head">
      <h1>{{ resume.basics.name || "姓名" }}</h1>
      <p v-if="resume.targetRole" class="role">{{ resume.targetRole }}</p>
      <p class="contact">{{ joinContact(resume) }}</p>
    </header>

    <section v-if="resume.basics.summary.trim()" class="block">
      <h2>个人概述</h2>
      <p class="summary">{{ resume.basics.summary }}</p>
    </section>

    <section v-if="resume.education.length" class="block">
      <h2>教育背景</h2>
      <div v-for="item in resume.education" :key="item.id" class="row">
        <div class="row-top">
          <strong>{{ item.school }}</strong>
          <span>{{ item.period }}</span>
        </div>
        <p>{{ [item.degree, item.major].filter(Boolean).join("  ·  ") }}</p>
        <p v-if="item.detail" class="muted">{{ item.detail }}</p>
      </div>
    </section>

    <section v-if="resume.internships.length" class="block">
      <h2>实习经历</h2>
      <div v-for="item in resume.internships" :key="item.id" class="row">
        <div class="row-top">
          <strong>{{ item.org }}{{ item.title ? "  ·  " + item.title : "" }}</strong>
          <span>{{ item.period }}</span>
        </div>
        <ul>
          <li v-for="(bullet, i) in item.bullets.filter(Boolean)" :key="i">{{ bullet }}</li>
        </ul>
      </div>
    </section>

    <section v-if="resume.projects.length" class="block">
      <h2>项目经历</h2>
      <div v-for="item in resume.projects" :key="item.id" class="row">
        <div class="row-top">
          <strong>{{ item.org }}{{ item.title ? "  ·  " + item.title : "" }}</strong>
          <span>{{ item.period }}</span>
        </div>
        <ul>
          <li v-for="(bullet, i) in item.bullets.filter(Boolean)" :key="i">{{ bullet }}</li>
        </ul>
      </div>
    </section>

    <section v-if="resume.skills.filter(Boolean).length" class="block">
      <h2>专业技能</h2>
      <p>{{ resume.skills.filter(Boolean).join("  ·  ") }}</p>
    </section>

    <section v-if="resume.awards.filter(Boolean).length" class="block">
      <h2>荣誉奖项</h2>
      <ul>
        <li v-for="(award, i) in resume.awards.filter(Boolean)" :key="i">{{ award }}</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.paper {
  box-sizing: border-box;
  background: #fff;
  color: #1a1a1a;
  font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif;
  font-size: 11pt;
  line-height: 1.45;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(40, 30, 20, 0.12);
}
.head {
  text-align: center;
  border-bottom: 1.5px solid #1a1a1a;
  padding-bottom: 8px;
  margin-bottom: 12px;
}
h1 {
  margin: 0;
  font-size: 22pt;
  letter-spacing: 0.12em;
  font-weight: 700;
}
.role,
.contact {
  margin: 4px 0 0;
  font-size: 10.5pt;
}
.block {
  margin-bottom: 10px;
}
h2 {
  margin: 0 0 6px;
  font-size: 12pt;
  border-bottom: 1px solid #c8c0b4;
  letter-spacing: 0.08em;
}
.row {
  margin-bottom: 6px;
}
.row-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.row p,
.summary {
  margin: 2px 0;
}
.muted {
  color: #555;
}
ul {
  margin: 2px 0 0;
  padding-left: 1.2em;
}
li {
  margin: 0;
}
</style>
