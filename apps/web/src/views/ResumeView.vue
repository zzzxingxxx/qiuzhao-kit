<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { resumeFileName } from "@qiuzhao/pdf";
import { pullIdentityFromProfile, type Profile, type Resume } from "@qiuzhao/schema";
import ResumePaper from "../components/ResumePaper.vue";

const loading = ref(false);
const saving = ref(false);
const overflowing = ref(false);
const profile = ref<Profile | null>(null);
const resume = ref<Resume | null>(null);
const paperHost = ref<HTMLElement | null>(null);
const skillDraft = ref("");
let observer: ResizeObserver | null = null;

function newExperience() {
  return { id: crypto.randomUUID(), org: "", title: "", period: "", bullets: [""] };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

function bulletsText(item: { bullets: string[] }): string {
  return item.bullets.join("\n");
}

function setBullets(item: { bullets: string[] }, text: string) {
  item.bullets = text.split("\n");
}

function checkOverflow() {
  const paper = paperHost.value?.querySelector(".paper") as HTMLElement | null;
  if (!paper) {
    overflowing.value = false;
    return;
  }
  overflowing.value = paper.scrollHeight > paper.clientHeight + 2;
}

async function load() {
  loading.value = true;
  try {
    const profiles = await request<{ items: Profile[] }>("/profiles");
    profile.value = profiles.items[0] ?? null;
    if (!profile.value) {
      resume.value = null;
      return;
    }
    const existing = await request<{ items: Resume[] }>(`/resumes?profileId=${profile.value.id}`);
    if (existing.items[0]) {
      resume.value = existing.items[0];
      return;
    }
    resume.value = await request<Resume>("/resumes", {
      method: "POST",
      body: JSON.stringify({ profileId: profile.value.id }),
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "加载简历失败");
  } finally {
    loading.value = false;
    await nextTick();
    checkOverflow();
  }
}

async function save(message = "已保存") {
  if (!resume.value) return;
  saving.value = true;
  try {
    resume.value = await request<Resume>(`/resumes/${resume.value.id}`, {
      method: "PUT",
      body: JSON.stringify(resume.value),
    });
    if (message) ElMessage.success(message);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存失败");
  } finally {
    saving.value = false;
  }
}

function pullFromProfile() {
  if (!resume.value || !profile.value) return;
  resume.value = pullIdentityFromProfile(resume.value, profile.value);
  ElMessage.success("已拉取档案中的姓名、联系方式和教育（实习/项目未改）");
}

async function exportPdf() {
  if (!resume.value) return;
  resume.value.version += 1;
  await save("");
  const title = resumeFileName(resume.value.basics.name, resume.value.targetRole, resume.value.version);
  const prev = document.title;
  document.title = title.replace(/\.pdf$/i, "");
  await nextTick();
  window.print();
  document.title = prev;
  ElMessage.success(`版本 v${resume.value.version}，请在打印对话框选择「另存为 PDF」`);
}

function addInternship() {
  resume.value?.internships.push(newExperience());
}
function addProject() {
  resume.value?.projects.push(newExperience());
}
function addSkill() {
  const value = skillDraft.value.trim();
  if (!value || !resume.value) return;
  resume.value.skills.push(value);
  skillDraft.value = "";
}
function addAward() {
  resume.value?.awards.push("");
}

watch(resume, () => nextTick().then(checkOverflow), { deep: true });

onMounted(async () => {
  await load();
  observer = new ResizeObserver(() => checkOverflow());
  if (paperHost.value) observer.observe(paperHost.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div v-loading="loading">
    <el-empty v-if="!profile" description="请先在「档案」页创建求职档案，再生成简历。" />
    <template v-else-if="resume">
      <div class="toolbar no-print">
        <div>
          <el-tag>模板 campus-onepage</el-tag>
          <el-tag type="info">版本 v{{ resume.version }}</el-tag>
          <el-tag v-if="overflowing" type="danger">超出一页，请删减内容</el-tag>
          <el-tag v-else type="success">当前未溢出一页</el-tag>
        </div>
        <div class="actions">
          <el-button @click="pullFromProfile">从档案拉取身份/教育</el-button>
          <el-button :loading="saving" @click="save()">保存</el-button>
          <el-button type="primary" :loading="saving" @click="exportPdf">导出 PDF</el-button>
        </div>
      </div>

      <div class="layout">
        <div class="editor no-print">
          <el-form label-width="88px">
            <el-form-item label="求职方向">
              <el-input v-model="resume.targetRole" placeholder="例如 后端开发" />
            </el-form-item>
            <el-form-item label="姓名">
              <el-input v-model="resume.basics.name" />
            </el-form-item>
            <el-form-item label="手机">
              <el-input v-model="resume.basics.phone" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="resume.basics.email" />
            </el-form-item>
            <el-form-item label="概述">
              <el-input v-model="resume.basics.summary" type="textarea" :rows="3" placeholder="一句话评价，可留空" />
            </el-form-item>
          </el-form>

          <h3>教育</h3>
          <p class="hint">教育默认从档案拉取。改学校请到档案页，或点「从档案拉取」。此处可改展示用的时间/说明。</p>
          <el-form v-for="item in resume.education" :key="item.id" label-width="88px" class="card">
            <el-form-item label="学校"><el-input v-model="item.school" /></el-form-item>
            <el-form-item label="学历/专业">
              <el-input v-model="item.degree" style="width: 120px" />
              <el-input v-model="item.major" />
            </el-form-item>
            <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
            <el-form-item label="说明"><el-input v-model="item.detail" placeholder="GPA / 排名" /></el-form-item>
          </el-form>

          <h3>实习经历</h3>
          <p class="hint">只存在简历，不回写档案。</p>
          <el-form v-for="item in resume.internships" :key="item.id" label-width="88px" class="card">
            <el-form-item label="公司"><el-input v-model="item.org" /></el-form-item>
            <el-form-item label="职位"><el-input v-model="item.title" /></el-form-item>
            <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
            <el-form-item label="要点">
              <el-input :model-value="bulletsText(item)" type="textarea" :rows="4" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
            </el-form-item>
            <el-button text type="danger" @click="resume!.internships = resume!.internships.filter((x) => x.id !== item.id)">删除</el-button>
          </el-form>
          <el-button @click="addInternship">增加实习</el-button>

          <h3>项目经历</h3>
          <p class="hint">只存在简历，不回写档案。</p>
          <el-form v-for="item in resume.projects" :key="item.id" label-width="88px" class="card">
            <el-form-item label="项目"><el-input v-model="item.org" /></el-form-item>
            <el-form-item label="角色"><el-input v-model="item.title" /></el-form-item>
            <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
            <el-form-item label="要点">
              <el-input :model-value="bulletsText(item)" type="textarea" :rows="4" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
            </el-form-item>
            <el-button text type="danger" @click="resume!.projects = resume!.projects.filter((x) => x.id !== item.id)">删除</el-button>
          </el-form>
          <el-button @click="addProject">增加项目</el-button>

          <h3>技能</h3>
          <div class="chips">
            <el-tag v-for="(skill, i) in resume.skills" :key="i" closable @close="resume!.skills.splice(i, 1)">{{ skill }}</el-tag>
            <el-input v-model="skillDraft" style="width: 160px" placeholder="回车添加" @keyup.enter="addSkill" />
          </div>

          <h3>荣誉奖项</h3>
          <el-input
            v-for="(_award, i) in resume.awards"
            :key="i"
            v-model="resume.awards[i]"
            class="award"
          >
            <template #append>
              <el-button @click="resume!.awards.splice(i, 1)">删</el-button>
            </template>
          </el-input>
          <el-button @click="addAward">增加奖项</el-button>
        </div>

        <div class="preview">
          <div ref="paperHost" class="paper-host">
            <ResumePaper :resume="resume" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.toolbar > div:first-child,
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) 1fr;
  gap: 24px;
  align-items: start;
}
.editor {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
}
.card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 8px 0;
  margin-bottom: 12px;
}
h3 {
  margin: 20px 0 6px;
  font-size: 15px;
}
.hint {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.award {
  margin-bottom: 8px;
}
.preview {
  overflow: auto;
}
.paper-host {
  min-width: 210mm;
}
@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
