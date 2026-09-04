<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
  type Profile,
  type Resume,
  type ResumeSectionKey,
} from "@qiuzhao/schema";
import ResumePaper from "../components/ResumePaper.vue";
import TemplateGallery from "../components/TemplateGallery.vue";

const loading = ref(false);
const saving = ref(false);
const overflowing = ref(false);
const profile = ref<Profile | null>(null);
const resume = ref<Resume | null>(null);
const paperHost = ref<HTMLElement | null>(null);
const previewCol = ref<HTMLElement | null>(null);
const scale = ref(1);
const openPanels = ref(["theme", "basics", "education", "internships", "projects", "skills"]);
let observer: ResizeObserver | null = null;

function newExperience() {
  return { id: crypto.randomUUID(), org: "", title: "", period: "", tech: "", bullets: [""] };
}

function newSkillGroup() {
  return { id: crypto.randomUUID(), label: "", items: "" };
}

function asResume(data: unknown): Resume {
  return normalizeResume(resumeSchema.parse(data));
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

function updateScale() {
  const pane = previewCol.value;
  const paper = paperHost.value?.querySelector(".paper") as HTMLElement | null;
  if (!pane || !paper) return;
  const available = pane.clientWidth - 32;
  scale.value = Math.max(0.35, Math.min(1, available / paper.offsetWidth));
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
      resume.value = asResume(existing.items[0]);
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

function selectTemplate(id: string) {
  if (!resume.value) return;
  const tpl = getResumeTemplate(id);
  resume.value = applyResumeTemplate(resume.value, id);
  ElMessage.success(`已套用「${tpl.name}」，实习和项目未改`);
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

watch(resume, () => nextTick().then(() => {
  checkOverflow();
  updateScale();
}), { deep: true });

onMounted(async () => {
  await load();
  observer = new ResizeObserver(() => {
    checkOverflow();
    updateScale();
  });
  if (paperHost.value) observer.observe(paperHost.value);
  if (previewCol.value) observer.observe(previewCol.value);
  window.addEventListener("resize", updateScale);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", updateScale);
});
</script>

<template>
  <div v-loading="loading">
    <el-empty v-if="!profile" description="请先在「档案」页创建求职档案，再生成简历。" />
    <template v-else-if="resume">
      <div class="toolbar no-print">
        <div>
          <el-tag>{{ getResumeTemplate(resume.templateId).name }}</el-tag>
          <el-tag type="info">版本 v{{ resume.version }}</el-tag>
          <el-tag v-if="overflowing" type="danger">超出一页，请删减或改用紧凑排版</el-tag>
          <el-tag v-else type="success">当前未溢出一页</el-tag>
        </div>
        <div class="actions">
          <el-button @click="pullFromProfile">从档案拉取身份/教育</el-button>
          <el-button :loading="saving" @click="save()">保存</el-button>
          <el-button type="primary" :loading="saving" @click="exportPdf">导出 PDF</el-button>
        </div>
      </div>

      <TemplateGallery :model-value="resume.templateId" @update:model-value="selectTemplate" />

      <div class="layout">
        <div class="editor no-print">
          <el-collapse v-model="openPanels">
            <el-collapse-item title="主题与模块" name="theme">
              <p class="hint">主题色、字号、疏密、模块显隐与顺序都会实时反映在右侧 A4 预览上。</p>
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
                    <el-button size="small">上传</el-button>
                  </el-upload>
                  <el-button v-if="resume.basics.photo" size="small" text type="danger" @click="clearPhoto">移除</el-button>
                </el-form-item>
              </el-form>
              <div class="sec-list">
                <div v-for="(sec, i) in resume.sections" :key="sec.key" class="sec-row">
                  <el-switch v-model="sec.visible" />
                  <span>{{ sectionLabel(sec.key) }}</span>
                  <el-button text :disabled="i === 0" @click="moveSection(i, -1)">上移</el-button>
                  <el-button text :disabled="i === resume.sections.length - 1" @click="moveSection(i, 1)">下移</el-button>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="个人信息" name="basics">
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
                <el-form-item label="微信">
                  <el-input v-model="resume.basics.wechat" />
                </el-form-item>
                <el-form-item label="GitHub">
                  <el-input v-model="resume.basics.github" placeholder="用户名或链接" />
                </el-form-item>
                <el-form-item label="主页">
                  <el-input v-model="resume.basics.website" />
                </el-form-item>
                <el-form-item label="城市">
                  <el-input v-model="resume.basics.location" />
                </el-form-item>
                <el-form-item label="自我评价">
                  <el-input v-model="resume.basics.summary" type="textarea" :rows="3" placeholder="两到四句，可留空" />
                </el-form-item>
              </el-form>
            </el-collapse-item>

            <el-collapse-item title="教育背景" name="education">
              <p class="hint">教育默认从档案拉取。改学校请到档案页，或点「从档案拉取」。此处可改展示用的时间/说明。</p>
              <el-form v-for="item in resume.education" :key="item.id" label-width="88px" class="card">
                <el-form-item label="学校"><el-input v-model="item.school" /></el-form-item>
                <el-form-item label="学历/专业">
                  <el-input v-model="item.degree" style="width: 120px" />
                  <el-input v-model="item.major" />
                </el-form-item>
                <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
                <el-form-item label="说明"><el-input v-model="item.detail" placeholder="GPA / 排名 / 主修课程" /></el-form-item>
              </el-form>
            </el-collapse-item>

            <el-collapse-item title="实习经历" name="internships">
              <p class="hint">只存在简历，不回写档案。要点一行一条，量化结果优先。</p>
              <el-form v-for="item in resume.internships" :key="item.id" label-width="88px" class="card">
                <el-form-item label="公司"><el-input v-model="item.org" /></el-form-item>
                <el-form-item label="职位"><el-input v-model="item.title" /></el-form-item>
                <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
                <el-form-item label="技术栈"><el-input v-model="item.tech" placeholder="可选" /></el-form-item>
                <el-form-item label="要点">
                  <el-input :model-value="bulletsText(item)" type="textarea" :rows="4" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
                </el-form-item>
                <el-button text type="danger" @click="resume!.internships = resume!.internships.filter((x) => x.id !== item.id)">删除</el-button>
              </el-form>
              <el-button @click="addInternship">增加实习</el-button>
            </el-collapse-item>

            <el-collapse-item title="项目经历" name="projects">
              <p class="hint">只存在简历，不回写档案。</p>
              <el-form v-for="item in resume.projects" :key="item.id" label-width="88px" class="card">
                <el-form-item label="项目"><el-input v-model="item.org" /></el-form-item>
                <el-form-item label="角色"><el-input v-model="item.title" /></el-form-item>
                <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
                <el-form-item label="技术栈"><el-input v-model="item.tech" /></el-form-item>
                <el-form-item label="要点">
                  <el-input :model-value="bulletsText(item)" type="textarea" :rows="4" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
                </el-form-item>
                <el-button text type="danger" @click="resume!.projects = resume!.projects.filter((x) => x.id !== item.id)">删除</el-button>
              </el-form>
              <el-button @click="addProject">增加项目</el-button>
            </el-collapse-item>

            <el-collapse-item title="专业技能" name="skills">
              <p class="hint">按组填写，例如「语言 / 框架：Java / Spring Boot / TypeScript」。</p>
              <el-form v-for="group in resume.skillGroups" :key="group.id" label-width="88px" class="card">
                <el-form-item label="分组">
                  <el-input v-model="group.label" placeholder="语言 / 框架" />
                </el-form-item>
                <el-form-item label="内容">
                  <el-input v-model="group.items" type="textarea" :rows="2" placeholder="用 / 或 、 分隔" />
                </el-form-item>
                <el-button text type="danger" @click="resume!.skillGroups = resume!.skillGroups.filter((x) => x.id !== group.id)">删除</el-button>
              </el-form>
              <el-button @click="addSkillGroup">增加技能组</el-button>
            </el-collapse-item>

            <el-collapse-item title="校园经历" name="campus">
              <el-form v-for="item in resume.campus" :key="item.id" label-width="88px" class="card">
                <el-form-item label="组织"><el-input v-model="item.org" /></el-form-item>
                <el-form-item label="职务"><el-input v-model="item.title" /></el-form-item>
                <el-form-item label="时间"><el-input v-model="item.period" /></el-form-item>
                <el-form-item label="要点">
                  <el-input :model-value="bulletsText(item)" type="textarea" :rows="3" placeholder="一行一条" @update:model-value="setBullets(item, $event)" />
                </el-form-item>
                <el-button text type="danger" @click="resume!.campus = resume!.campus.filter((x) => x.id !== item.id)">删除</el-button>
              </el-form>
              <el-button @click="addCampus">增加校园经历</el-button>
            </el-collapse-item>

            <el-collapse-item title="荣誉奖项" name="awards">
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
            </el-collapse-item>
          </el-collapse>
        </div>

        <div ref="previewCol" class="preview-col">
          <div class="preview-meta no-print">
            实时预览 · A4 · {{ Math.round(scale * 100) }}%
          </div>
          <div
            class="paper-frame"
            :style="{
              width: `calc(210mm * ${scale})`,
              height: `calc(297mm * ${scale})`,
            }"
          >
            <div class="paper-scale" :style="{ transform: `scale(${scale})` }">
              <div ref="paperHost" class="paper-host">
                <ResumePaper :resume="resume" />
              </div>
            </div>
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
  grid-template-columns: minmax(320px, 440px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.editor {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 16px 16px;
}
.card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 8px 0;
  margin-bottom: 12px;
}
.hint {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
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
  gap: 6px;
}
.sec-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--line);
}
.sec-row span {
  flex: 1;
}
.preview-col {
  position: sticky;
  top: 12px;
  background: #d9d5ce;
  border-radius: 10px;
  padding: 12px 16px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-meta {
  align-self: flex-start;
  color: #5c564c;
  font-size: 12px;
  margin-bottom: 8px;
}
.paper-frame {
  overflow: hidden;
}
.paper-scale {
  transform-origin: top left;
}
.paper-host {
  width: 210mm;
}
@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .preview-col {
    position: static;
  }
}
</style>
