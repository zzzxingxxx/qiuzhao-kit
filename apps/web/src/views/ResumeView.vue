<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage, type UploadFile } from "element-plus";
import { resumeFileName } from "@qiuzhao/pdf";
import {
  RESUME_SECTION_LABELS,
  RESUME_THEME_PRESETS,
  applyResumeTemplate,
  getResumeTemplate,
  normalizeResume,
  pullIdentityFromProfile,
  resumeSchema,
  type AiPatch,
  type Profile,
  type Resume,
  type ResumeSectionKey,
} from "@qiuzhao/schema";
import { pickPrimaryProfile, request } from "../api";
import { activeResume, aiDrawerOpen, applyAiPatch } from "../ai-ui";
import ResumePaper from "../components/ResumePaper.vue";
import TemplateGallery from "../components/TemplateGallery.vue";

type Panel = "theme" | "basics" | "education" | "internships" | "projects" | "skills" | "campus" | "awards";

const panels: { id: Panel; label: string }[] = [
  { id: "theme", label: "排版" },
  { id: "basics", label: "个人信息" },
  { id: "education", label: "教育背景" },
  { id: "internships", label: "实习经历" },
  { id: "projects", label: "项目经历" },
  { id: "skills", label: "专业技能" },
  { id: "campus", label: "校园经历" },
  { id: "awards", label: "荣誉奖项" },
];

const loading = ref(true);
const saving = ref(false);
const overflowing = ref(false);
const showTemplates = ref(false);
const panel = ref<Panel>("basics");
const profile = ref<Profile | null>(null);
const resume = ref<Resume | null>(null);
const paperHost = ref<HTMLElement | null>(null);
const previewCol = ref<HTMLElement | null>(null);
const scale = ref(0.55);
const zoomMode = ref<"fit" | "manual">("fit");
const showBig = ref(false);
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
let observer: ResizeObserver | null = null;

const tpl = computed(() => (resume.value ? getResumeTemplate(resume.value.templateId) : null));

function newExperience() {
  return { id: crypto.randomUUID(), org: "", title: "", period: "", tech: "", bullets: [""] };
}
function newSkillGroup() {
  return { id: crypto.randomUUID(), label: "", items: "" };
}
function asResume(data: unknown): Resume {
  return normalizeResume(resumeSchema.parse(data));
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

function updateScale() {
  if (zoomMode.value !== "fit") return;
  const pane = previewCol.value;
  const paper = paperHost.value?.querySelector(".paper") as HTMLElement | null;
  if (!pane || !paper) return;
  const sw = (pane.clientWidth - 40) / paper.offsetWidth;
  const sh = (pane.clientHeight - 72) / paper.offsetHeight;
  scale.value = Math.max(0.32, Math.min(1, sw, sh));
}

function setZoom(next: number) {
  zoomMode.value = "manual";
  scale.value = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)) * 100) / 100;
}
function zoomIn() {
  setZoom(scale.value + 0.1);
}
function zoomOut() {
  setZoom(scale.value - 0.1);
}
function zoomFit() {
  zoomMode.value = "fit";
  nextTick(updateScale);
}
function zoomHundred() {
  setZoom(1);
}

function onPreviewWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  setZoom(scale.value + (event.deltaY < 0 ? 0.08 : -0.08));
}

function applyPatch(patch: AiPatch) {
  if (!resume.value) return;
  if (patch.summary?.trim()) resume.value.basics.summary = patch.summary.trim();
  for (const item of patch.internships ?? []) {
    const target = resume.value.internships.find((row) => row.id === item.id);
    if (target && item.bullets?.length) target.bullets = item.bullets;
  }
  for (const item of patch.projects ?? []) {
    const target = resume.value.projects.find((row) => row.id === item.id);
    if (target && item.bullets?.length) target.bullets = item.bullets;
  }
  for (const item of patch.campus ?? []) {
    const target = resume.value.campus.find((row) => row.id === item.id);
    if (target && item.bullets?.length) target.bullets = item.bullets;
  }
}

async function load() {
  loading.value = true;
  try {
    const profiles = await request<{ items: Profile[] }>("/profiles");
    profile.value = pickPrimaryProfile(profiles.items);
    if (!profile.value) {
      resume.value = null;
      return;
    }
    const existing = await request<{ items: Resume[] }>(`/resumes?profileId=${profile.value.id}`);
    if (existing.items[0]) {
      resume.value = asResume(existing.items[0]);
      return;
    }
    const all = await request<{ items: Resume[] }>("/resumes");
    const owned = all.items[0];
    if (owned) {
      profile.value = profiles.items.find((item) => item.id === owned.profileId) ?? profile.value;
      resume.value = asResume(owned);
      return;
    }
    resume.value = asResume(
      await request<Resume>("/resumes", {
        method: "POST",
        body: JSON.stringify({ profileId: profile.value.id }),
      }),
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "加载简历失败");
  } finally {
    loading.value = false;
    await nextTick();
    checkOverflow();
    updateScale();
  }
}

async function save(message = "已保存") {
  if (!resume.value) return;
  saving.value = true;
  try {
    resume.value = asResume(
      await request<Resume>(`/resumes/${resume.value.id}`, {
        method: "PUT",
        body: JSON.stringify(resume.value),
      }),
    );
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

async function selectTemplate(id: string) {
  if (!resume.value) return;
  const next = getResumeTemplate(id);
  resume.value = applyResumeTemplate(resume.value, id);
  showTemplates.value = false;
  await save(`已套用完整模板「${next.name}」，请把示例经历改成你自己的`);
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
function addCampus() {
  resume.value?.campus.push(newExperience());
}
function addSkillGroup() {
  resume.value?.skillGroups.push(newSkillGroup());
}
function addAward() {
  resume.value?.awards.push("");
}

function moveSection(index: number, dir: number) {
  if (!resume.value) return;
  const next = index + dir;
  const list = resume.value.sections;
  if (next < 0 || next >= list.length) return;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  resume.value.sections = copy;
}

function sectionLabel(key: ResumeSectionKey) {
  return RESUME_SECTION_LABELS[key];
}

async function onPhoto(file: File) {
  if (!resume.value) return;
  if (!file.type.startsWith("image/")) {
    ElMessage.error("请选择图片文件");
    return;
  }
  try {
    resume.value.basics.photo = await compressPhoto(file);
    resume.value.theme.showPhoto = true;
  } catch {
    ElMessage.error("证件照读取失败");
  }
}

function clearPhoto() {
  if (!resume.value) return;
  resume.value.basics.photo = "";
  resume.value.theme.showPhoto = false;
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 360;
      const maxH = 504;
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

watch(
  resume,
  (value) => {
    activeResume.value = value;
    nextTick().then(() => {
      checkOverflow();
      updateScale();
    });
  },
  { deep: true },
);

onMounted(async () => {
  applyAiPatch.value = applyPatch;
  await load();
  await nextTick();
  observer = new ResizeObserver(() => {
    checkOverflow();
    updateScale();
  });
  if (paperHost.value) observer.observe(paperHost.value);
  if (previewCol.value) {
    observer.observe(previewCol.value);
    previewCol.value.addEventListener("wheel", onPreviewWheel, { passive: false });
  }
  window.addEventListener("resize", updateScale);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  previewCol.value?.removeEventListener("wheel", onPreviewWheel);
  window.removeEventListener("resize", updateScale);
  if (activeResume.value === resume.value) activeResume.value = null;
  applyAiPatch.value = null;
});
</script>

<template>
  <div v-loading="loading" class="studio">
    <el-empty v-if="!loading && !profile" class="empty" description="请先在「档案」里填写姓名和学校，再来生成简历。" />
    <template v-else-if="resume">
      <header class="bar no-print">
        <div class="who">
          <strong>{{ resume.basics.name || "未命名" }}</strong>
          <span>{{ resume.targetRole || "校招" }}</span>
          <em v-if="tpl">{{ tpl.name }}</em>
          <small>v{{ resume.version }}</small>
          <b :class="{ bad: overflowing }">{{ overflowing ? "超出一页" : "未溢出" }}</b>
        </div>
        <div class="bar-actions">
          <button type="button" class="btn" @click="$router.push('/templates')">全部模板</button>
          <button type="button" class="btn" @click="showTemplates = true">换模板</button>
          <button type="button" class="btn" @click="pullFromProfile">拉档案</button>
          <button type="button" class="btn" @click="aiDrawerOpen = true">AI 润色</button>
          <button type="button" class="btn" :disabled="saving" @click="save()">保存</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="exportPdf">导出 PDF</button>
        </div>
      </header>

      <div class="studio-body">
        <nav class="mods no-print">
          <button
            v-for="item in panels"
            :key="item.id"
            type="button"
            :class="{ on: panel === item.id }"
            @click="panel = item.id"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="editor no-print">
          <section v-if="panel === 'theme'">
            <h2>排版</h2>
            <p class="hint">主题色、字号、疏密、模块显隐都会立刻反映在右侧 A4 上。</p>
            <el-form label-width="88px">
              <el-form-item label="主题色">
                <div class="swatches">
                  <button
                    v-for="preset in RESUME_THEME_PRESETS"
                    :key="preset.color"
                    type="button"
                    class="swatch"
                    :class="{ active: resume.theme.color === preset.color }"
                    :style="{ background: preset.color }"
                    :title="preset.label"
                    @click="resume.theme.color = preset.color"
                  />
                  <el-color-picker v-model="resume.theme.color" />
                </div>
              </el-form-item>
              <el-form-item label="疏密">
                <el-radio-group v-model="resume.theme.density">
                  <el-radio-button value="compact">紧凑</el-radio-button>
                  <el-radio-button value="normal">标准</el-radio-button>
                  <el-radio-button value="relaxed">宽松</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="正文字号">
                <el-slider v-model="resume.theme.fontSizePt" :min="9" :max="13" :step="0.5" show-input />
              </el-form-item>
              <el-form-item label="证件照">
                <el-switch v-model="resume.theme.showPhoto" />
                <el-upload
                  :show-file-list="false"
                  accept="image/*"
                  :auto-upload="false"
                  :on-change="(file: UploadFile) => file.raw && onPhoto(file.raw)"
                >
                  <button type="button" class="btn">上传</button>
                </el-upload>
                <button v-if="resume.basics.photo" type="button" class="btn btn-ghost" @click="clearPhoto">移除</button>
              </el-form-item>
            </el-form>
            <div class="sec-list">
              <div v-for="(sec, i) in resume.sections" :key="sec.key" class="sec-row">
                <el-switch v-model="sec.visible" />
                <span>{{ sectionLabel(sec.key) }}</span>
                <button type="button" class="btn btn-ghost" :disabled="i === 0" @click="moveSection(i, -1)">上移</button>
                <button type="button" class="btn btn-ghost" :disabled="i === resume.sections.length - 1" @click="moveSection(i, 1)">下移</button>
              </div>
            </div>
          </section>

          <section v-else-if="panel === 'basics'">
            <h2>个人信息</h2>
            <el-form label-width="88px">
              <el-form-item label="求职方向"><el-input v-model="resume.targetRole" placeholder="例如 后端开发" /></el-form-item>
              <el-form-item label="姓名"><el-input v-model="resume.basics.name" /></el-form-item>
              <el-form-item label="手机"><el-input v-model="resume.basics.phone" /></el-form-item>
              <el-form-item label="邮箱"><el-input v-model="resume.basics.email" /></el-form-item>
              <el-form-item label="微信"><el-input v-model="resume.basics.wechat" /></el-form-item>
              <el-form-item label="GitHub"><el-input v-model="resume.basics.github" placeholder="用户名或链接" /></el-form-item>
              <el-form-item label="主页"><el-input v-model="resume.basics.website" /></el-form-item>
              <el-form-item label="城市"><el-input v-model="resume.basics.location" /></el-form-item>
              <el-form-item label="自我评价">
                <el-input v-model="resume.basics.summary" type="textarea" :rows="4" placeholder="两到四句，可留空" />
              </el-form-item>
            </el-form>
          </section>

          <section v-else-if="panel === 'education'">
            <h2>教育背景</h2>
            <p class="hint">学校以档案为准。这里只改展示用的时间和说明。</p>
            <el-form v-for="item in resume.education" :key="item.id" label-width="88px" class="block">
              <el-form-item label="学校"><el-input v-model="item.school" /></el-form-item>
              <el-form-item label="学历/专业">
                <el-input v-model="item.degree" style="width: 120px" />
                <el-input v-model="item.major" />
              </el-form-item>
              <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
              <el-form-item label="说明"><el-input v-model="item.detail" placeholder="GPA / 排名 / 主修课程" /></el-form-item>
            </el-form>
          </section>

          <section v-else-if="panel === 'internships'">
            <h2>实习经历</h2>
            <p class="hint">只存在简历。要点一行一条，能量化就量化。</p>
            <el-form v-for="item in resume.internships" :key="item.id" label-width="88px" class="block">
              <el-form-item label="公司"><el-input v-model="item.org" /></el-form-item>
              <el-form-item label="职位"><el-input v-model="item.title" /></el-form-item>
              <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
              <el-form-item label="技术栈"><el-input v-model="item.tech" /></el-form-item>
              <el-form-item label="要点">
                <el-input :model-value="bulletsText(item)" type="textarea" :rows="4" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
              </el-form-item>
              <button type="button" class="btn btn-ghost" @click="resume!.internships = resume!.internships.filter((x) => x.id !== item.id)">删除</button>
            </el-form>
            <button type="button" class="btn" @click="addInternship">增加实习</button>
          </section>

          <section v-else-if="panel === 'projects'">
            <h2>项目经历</h2>
            <el-form v-for="item in resume.projects" :key="item.id" label-width="88px" class="block">
              <el-form-item label="项目"><el-input v-model="item.org" /></el-form-item>
              <el-form-item label="角色"><el-input v-model="item.title" /></el-form-item>
              <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
              <el-form-item label="技术栈"><el-input v-model="item.tech" /></el-form-item>
              <el-form-item label="要点">
                <el-input :model-value="bulletsText(item)" type="textarea" :rows="4" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
              </el-form-item>
              <button type="button" class="btn btn-ghost" @click="resume!.projects = resume!.projects.filter((x) => x.id !== item.id)">删除</button>
            </el-form>
            <button type="button" class="btn" @click="addProject">增加项目</button>
          </section>

          <section v-else-if="panel === 'skills'">
            <h2>专业技能</h2>
            <el-form v-for="group in resume.skillGroups" :key="group.id" label-width="88px" class="block">
              <el-form-item label="分组"><el-input v-model="group.label" placeholder="语言 / 框架" /></el-form-item>
              <el-form-item label="内容"><el-input v-model="group.items" type="textarea" :rows="2" /></el-form-item>
              <button type="button" class="btn btn-ghost" @click="resume!.skillGroups = resume!.skillGroups.filter((x) => x.id !== group.id)">删除</button>
            </el-form>
            <button type="button" class="btn" @click="addSkillGroup">增加技能组</button>
          </section>

          <section v-else-if="panel === 'campus'">
            <h2>校园经历</h2>
            <el-form v-for="item in resume.campus" :key="item.id" label-width="88px" class="block">
              <el-form-item label="组织"><el-input v-model="item.org" /></el-form-item>
              <el-form-item label="职务"><el-input v-model="item.title" /></el-form-item>
              <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
              <el-form-item label="要点">
                <el-input :model-value="bulletsText(item)" type="textarea" :rows="3" @update:model-value="setBullets(item, $event)" />
              </el-form-item>
              <button type="button" class="btn btn-ghost" @click="resume!.campus = resume!.campus.filter((x) => x.id !== item.id)">删除</button>
            </el-form>
            <button type="button" class="btn" @click="addCampus">增加校园经历</button>
          </section>

          <section v-else>
            <h2>荣誉奖项</h2>
            <el-input v-for="(_award, i) in resume.awards" :key="i" v-model="resume.awards[i]" class="award">
              <template #append>
                <el-button @click="resume!.awards.splice(i, 1)">删</el-button>
              </template>
            </el-input>
            <button type="button" class="btn" @click="addAward">增加奖项</button>
          </section>
        </div>

        <div ref="previewCol" class="preview-col">
          <div class="preview-toolbar no-print">
            <span>A4 预览</span>
            <div class="zoom">
              <button type="button" class="btn" :disabled="scale <= MIN_ZOOM" @click="zoomOut">−</button>
              <b>{{ Math.round(scale * 100) }}%</b>
              <button type="button" class="btn" :disabled="scale >= MAX_ZOOM" @click="zoomIn">+</button>
              <button type="button" class="btn" :class="{ on: zoomMode === 'manual' && scale === 0.5 }" @click="setZoom(0.5)">50%</button>
              <button type="button" class="btn" :class="{ on: zoomMode === 'manual' && scale === 0.75 }" @click="setZoom(0.75)">75%</button>
              <button type="button" class="btn" :class="{ on: zoomMode === 'fit' }" @click="zoomFit">适应窗口</button>
              <button type="button" class="btn" :class="{ on: zoomMode === 'manual' && scale === 1 }" @click="zoomHundred">100%</button>
              <button type="button" class="btn btn-primary" @click="showBig = true">放大查看</button>
            </div>
          </div>
          <div
            class="paper-frame"
            :style="{
              width: `calc(210mm * ${scale})`,
              height: `calc(297mm * ${scale})`,
            }"
            @dblclick="showBig = true"
          >
            <div class="paper-scale" :style="{ transform: `scale(${scale})` }">
              <div ref="paperHost" class="paper-host">
                <ResumePaper :resume="resume" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <el-dialog v-model="showTemplates" title="选择完整模板" width="92%" top="4vh" append-to-body class="no-print" destroy-on-close>
        <TemplateGallery :model-value="resume.templateId" @update:model-value="selectTemplate" />
      </el-dialog>
      <el-dialog v-model="showBig" title="A4 原大预览" width="860px" top="2vh" append-to-body class="no-print" destroy-on-close>
        <p class="hint">按实际纸面大小查看。可滚动。打印仍用「导出 PDF」。</p>
        <div class="big-preview">
          <ResumePaper :resume="resume" />
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<style scoped>
.studio {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #eef2f7;
  position: relative;
}
.empty {
  margin-top: 12vh;
}
.bar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}
.who {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}
.who strong {
  font-size: 15px;
}
.who span,
.who em,
.who small {
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
}
.who b {
  font-weight: 600;
  font-size: 12px;
  color: var(--ok);
}
.who b.bad {
  color: var(--danger);
}
.bar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.studio-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 168px minmax(300px, 400px) minmax(0, 1fr);
}
.mods {
  border-right: 1px solid var(--line);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f8fafc;
  overflow: auto;
}
.mods button {
  text-align: left;
  border: 0;
  background: transparent;
  padding: 9px 12px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  flex: none;
}
.mods button.on,
.mods button:hover {
  background: #fff;
  color: var(--ink);
}
.editor {
  overflow: auto;
  padding: 18px 18px 32px;
  background: var(--panel);
  border-right: 1px solid var(--line);
}
.editor h2 {
  margin: 0 0 10px;
  font-size: 18px;
}
.block {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 8px 4px;
  margin-bottom: 12px;
  background: #fff;
}
.award {
  margin-bottom: 8px;
}
.swatches {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.swatch.active {
  border-color: #111;
  outline: 2px solid #fff;
  box-shadow: 0 0 0 1px #111;
}
.sec-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sec-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--line);
}
.sec-row span {
  flex: 1;
}
.preview-col {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #d7dee8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 12px 20px;
}
.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  background: #d7dee8;
  padding: 4px 0 10px;
  color: #475569;
  font-size: 12px;
}
.zoom {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.zoom b {
  min-width: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--ink);
}
.zoom .btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
}
.zoom .btn.on {
  border-color: var(--accent);
  color: var(--accent);
  background: #fff;
}
.paper-frame {
  overflow: hidden;
  cursor: zoom-in;
}
.big-preview {
  display: flex;
  justify-content: center;
  overflow: auto;
  max-height: 82vh;
  background: #d7dee8;
  padding: 16px;
  border-radius: 10px;
}
.paper-scale {
  transform-origin: top left;
}
.paper-host {
  width: 210mm;
}
@media (max-width: 1100px) {
  .bar {
    height: auto;
    padding: 10px 12px;
    flex-wrap: wrap;
  }
  .studio-body {
    grid-template-columns: 1fr;
  }
  .mods {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  .preview-col {
    min-height: 70vh;
  }
}
</style>
