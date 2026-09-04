<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  AI_ACTION_HINTS,
  AI_ACTION_LABELS,
  RESUME_SECTION_LABELS,
  aiPatchHasContent,
  aiSectionLabels,
  clipAiPatch,
  resolveAiSections,
  type AiChatAction,
  type AiChatMessage,
  type AiPatch,
  type Resume,
  type ResumeSectionKey,
} from "@qiuzhao/schema";
import { chatAi, getAiSettings } from "../api";
import { activeResume, aiDrawerOpen, aiReady, applyAiPatch } from "../ai-ui";

type Bubble = { role: "user" | "assistant"; content: string; patch?: AiPatch | null };
type ActionCard = { id: AiChatAction; needsJd?: boolean; writes?: boolean };
type PreviewBlock = { title: string; lines: string[]; patch: AiPatch };

const router = useRouter();
const loading = ref(false);
const input = ref("");
const jobDesc = ref("");
const messages = ref<Bubble[]>([]);
const selected = ref<ResumeSectionKey[]>([]);
const configured = computed(() => aiReady.value);

const rewriteActions: ActionCard[] = [
  { id: "polish", writes: true },
  { id: "star", writes: true },
  { id: "summary", writes: true },
  { id: "match", writes: true, needsJd: true },
];

const reviewActions: ActionCard[] = [
  { id: "critique" },
  { id: "keywords", needsJd: true },
  { id: "interview" },
];

function filledExp(list: Resume["internships"]) {
  return list.some((item) => item.org.trim() || item.title.trim() || item.bullets.some((b) => b.trim()));
}

function isFilled(resume: Resume, key: ResumeSectionKey): boolean {
  if (key === "summary") return true;
  if (key === "education") return resume.education.some((item) => item.school.trim() || item.detail.trim());
  if (key === "internships") return filledExp(resume.internships);
  if (key === "projects") return filledExp(resume.projects);
  if (key === "campus") return filledExp(resume.campus);
  if (key === "skills") {
    return resume.skillGroups.some((g) => g.items.trim()) || resume.skills.some((s) => s.trim());
  }
  if (key === "awards") return resume.awards.some((item) => item.trim());
  return false;
}

const moduleOptions = computed(() => {
  const resume = activeResume.value;
  if (!resume) return [];
  return resume.sections
    .filter((sec) => sec.visible)
    .map((sec) => ({
      key: sec.key,
      label: RESUME_SECTION_LABELS[sec.key],
      filled: isFilled(resume, sec.key),
    }));
});

const filledKeys = computed(() => moduleOptions.value.filter((item) => item.filled).map((item) => item.key));

function selectFilled() {
  selected.value = [...filledKeys.value];
}

function toggleSection(key: ResumeSectionKey, filled: boolean) {
  if (!filled) return;
  if (selected.value.includes(key)) {
    selected.value = selected.value.filter((item) => item !== key);
    return;
  }
  selected.value = [...selected.value, key];
}

function extractPatch(text: string): AiPatch | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as AiPatch;
    return aiPatchHasContent(obj) ? obj : null;
  } catch {
    return null;
  }
}

function displayText(msg: Bubble): string {
  if (!msg.patch) return msg.content;
  const start = msg.content.indexOf("{");
  if (start < 0) return msg.content;
  return msg.content.slice(0, start).trim();
}

function expLabel(kind: "internships" | "projects" | "campus", id: string): string {
  const item = activeResume.value?.[kind]?.find((row) => row.id === id);
  if (!item) return "未匹配到原条目";
  return [item.org, item.title].filter((part) => part.trim()).join(" · ") || "未命名";
}

function previewBlocks(patch: AiPatch): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  if (patch.summary?.trim()) {
    blocks.push({
      title: RESUME_SECTION_LABELS.summary,
      lines: [patch.summary.trim()],
      patch: { summary: patch.summary.trim() },
    });
  }
  for (const item of patch.education ?? []) {
    const edu = activeResume.value?.education.find((row) => row.id === item.id);
    blocks.push({
      title: `${RESUME_SECTION_LABELS.education} · ${edu?.school || "未匹配"}`,
      lines: [item.detail].filter((line) => line.trim()),
      patch: { education: [item] },
    });
  }
  const groups: { kind: "internships" | "projects" | "campus"; title: string }[] = [
    { kind: "internships", title: RESUME_SECTION_LABELS.internships },
    { kind: "projects", title: RESUME_SECTION_LABELS.projects },
    { kind: "campus", title: RESUME_SECTION_LABELS.campus },
  ];
  for (const group of groups) {
    for (const item of patch[group.kind] ?? []) {
      const lines = (item.bullets ?? []).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) continue;
      blocks.push({
        title: `${group.title} · ${expLabel(group.kind, item.id)}`,
        lines,
        patch: { [group.kind]: [item] },
      });
    }
  }
  for (const item of patch.skillGroups ?? []) {
    const group = activeResume.value?.skillGroups.find((row) => row.id === item.id);
    blocks.push({
      title: `${RESUME_SECTION_LABELS.skills} · ${group?.label || "未分组"}`,
      lines: [item.items].filter((line) => line.trim()),
      patch: { skillGroups: [item] },
    });
  }
  if (patch.awards?.length) {
    blocks.push({
      title: RESUME_SECTION_LABELS.awards,
      lines: patch.awards.map((line) => line.trim()).filter(Boolean),
      patch: { awards: patch.awards },
    });
  }
  return blocks;
}

watch(aiDrawerOpen, async (open) => {
  if (!open) return;
  if (!selected.value.length) selectFilled();
  try {
    const settings = await getAiSettings();
    aiReady.value = settings.hasKey;
  } catch {
    aiReady.value = false;
  }
});

watch(activeResume, (resume) => {
  if (!resume) {
    selected.value = [];
    return;
  }
  if (!selected.value.length) selectFilled();
});

async function run(action: AiChatAction, prompt?: string) {
  if (!configured.value) {
    ElMessage.warning("请先到设置里配置 API 地址和密钥");
    await router.push("/settings");
    aiDrawerOpen.value = false;
    return;
  }
  const text = (prompt ?? input.value).trim();
  if (action === "chat" && !text) return;
  if ((action === "match" || action === "keywords") && !jobDesc.value.trim()) {
    ElMessage.warning("请先粘贴岗位描述");
    return;
  }
  if (action !== "chat" && !activeResume.value) {
    ElMessage.warning("请先打开一份简历");
    return;
  }
  const sections = resolveAiSections(action, selected.value);
  if (action === "star" && !sections.length) {
    ElMessage.warning("STAR 改写请先勾选实习、项目或校园经历");
    return;
  }
  if ((action === "polish" || action === "match") && !sections.length) {
    ElMessage.warning("请先勾选要改的模块");
    return;
  }
  if (action === "critique" || action === "keywords" || action === "interview") {
    if (!selected.value.length) {
      ElMessage.warning("请先勾选要分析的模块");
      return;
    }
  }

  const scope = sections.length ? `（${aiSectionLabels(sections)}）` : selected.value.length ? `（${aiSectionLabels(selected.value)}）` : "";
  if (action !== "chat") {
    messages.value.push({ role: "user", content: text || `${AI_ACTION_LABELS[action]}${scope}` });
  } else {
    messages.value.push({ role: "user", content: text });
    input.value = "";
  }

  const history: AiChatMessage[] = messages.value.slice(0, -1).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const sendSections = action === "chat" ? selected.value : sections.length ? sections : selected.value;

  loading.value = true;
  try {
    const result = await chatAi({
      action,
      prompt: action === "chat" ? text : text || AI_ACTION_LABELS[action],
      messages: history,
      jobDesc: jobDesc.value.trim() || undefined,
      resume: activeResume.value ?? undefined,
      sections: sendSections.length ? sendSections : undefined,
    });
    const content = result.content || "（空回复）";
    const raw = extractPatch(content);
    const patch = raw ? clipAiPatch(raw, sendSections.length ? sendSections : undefined) : null;
    messages.value.push({
      role: "assistant",
      content,
      patch: patch && aiPatchHasContent(patch) ? patch : null,
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "助手调用失败");
  } finally {
    loading.value = false;
  }
}

function apply(patch: AiPatch, only?: string) {
  if (!applyAiPatch.value) {
    ElMessage.warning("请打开简历页再应用改写");
    return;
  }
  applyAiPatch.value(patch);
  ElMessage.success(only ? `已写入${only}，请核对预览后保存` : "已写入勾选模块，请核对预览后保存");
}

function discard(msg: Bubble) {
  msg.patch = null;
}

function clearThread() {
  messages.value = [];
}
</script>

<template>
  <el-drawer v-model="aiDrawerOpen" size="500px" class="no-print" append-to-body>
    <template #header>
      <div class="head">
        <strong>AI 简历助手</strong>
        <span>按模块改写 · 本机转发 · 改写需你点应用</span>
      </div>
    </template>

    <p class="lead">先勾选模块，再点改写或诊断。不会编造经历。密钥只存在本机服务。</p>
    <div v-if="!configured" class="warn">尚未配置密钥。到「设置」填写地址和 Key，再点拉取模型。</div>

    <section class="group">
      <h3>改哪些模块</h3>
      <p class="hint">可多选。改写只动勾选的段，其他模块保持不动。</p>
      <div class="mods">
        <button
          v-for="item in moduleOptions"
          :key="item.key"
          type="button"
          class="mod"
          :class="{ on: selected.includes(item.key) }"
          :disabled="!item.filled"
          :title="item.filled ? item.label : '这段还是空的'"
          @click="toggleSection(item.key, item.filled)"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="mod-bar">
        <span>已选 {{ selected.length }} 项</span>
        <button type="button" class="btn btn-ghost" :disabled="!filledKeys.length" @click="selectFilled">已填全选</button>
        <button type="button" class="btn btn-ghost" :disabled="!selected.length" @click="selected = []">清空</button>
      </div>
    </section>

    <section class="group">
      <h3>改写简历</h3>
      <p class="hint">生成可核对的补丁。可整份应用，也可只写入其中一段。</p>
      <div class="cards">
        <button
          v-for="item in rewriteActions"
          :key="item.id"
          type="button"
          class="action"
          :disabled="loading || !activeResume"
          @click="run(item.id)"
        >
          <b>{{ AI_ACTION_LABELS[item.id] }}</b>
          <em>{{ AI_ACTION_HINTS[item.id] }}</em>
        </button>
      </div>
    </section>

    <section class="group">
      <h3>分析诊断</h3>
      <p class="hint">只出文字建议，范围同样跟随上面勾选的模块。</p>
      <div class="cards">
        <button
          v-for="item in reviewActions"
          :key="item.id"
          type="button"
          class="action"
          :disabled="loading || !activeResume"
          @click="run(item.id)"
        >
          <b>{{ AI_ACTION_LABELS[item.id] }}</b>
          <em>{{ AI_ACTION_HINTS[item.id] }}</em>
        </button>
      </div>
    </section>

    <label class="jd-label">岗位描述（按 JD 改写 / 对照关键词时必填）</label>
    <el-input
      v-model="jobDesc"
      class="mb"
      type="textarea"
      :rows="3"
      placeholder="粘贴招聘启事里的职责与要求，用于「按 JD 改写」和「对照 JD 关键词」"
    />

    <div class="thread-head">
      <span>对话</span>
      <button v-if="messages.length" type="button" class="btn btn-ghost" @click="clearThread">清空</button>
    </div>
    <div class="thread">
      <div v-if="!messages.length" class="empty">
        例如只勾选「实习经历」再点润色，项目和校园不会被改。也可以对某一段提问。
      </div>
      <div v-for="(msg, i) in messages" :key="i" class="bubble" :class="msg.role">
        <pre v-if="displayText(msg)">{{ displayText(msg) }}</pre>
        <div v-if="msg.patch" class="patch">
          <p class="patch-lead">可按段写入简历，请先核对：</p>
          <div v-for="(block, bi) in previewBlocks(msg.patch)" :key="bi" class="patch-block">
            <div class="patch-head">
              <h4>{{ block.title }}</h4>
              <button type="button" class="btn btn-ghost" @click="apply(block.patch, block.title)">只应用这段</button>
            </div>
            <ul>
              <li v-for="(line, li) in block.lines" :key="li">{{ line }}</li>
            </ul>
          </div>
          <div class="patch-actions">
            <button type="button" class="btn btn-primary" @click="apply(msg.patch)">应用全部改写</button>
            <button type="button" class="btn" @click="discard(msg)">不用这份</button>
          </div>
        </div>
      </div>
      <p v-if="loading" class="loading">助手正在写…</p>
    </div>

    <div class="composer">
      <el-input
        v-model="input"
        type="textarea"
        :rows="3"
        placeholder="针对勾选模块提问，例如：实习第二点怎么写更向量化。Ctrl+Enter 发送"
        @keydown.enter.ctrl="run('chat')"
      />
      <button type="button" class="btn btn-primary" :disabled="loading || !input.trim()" @click="run('chat')">
        {{ AI_ACTION_LABELS.chat }}
      </button>
    </div>
  </el-drawer>
</template>

<style scoped>
.head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.head strong {
  font-size: 16px;
}
.head span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}
.lead {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.warn {
  background: var(--accent-soft);
  color: var(--danger);
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 12px;
}
.group {
  margin-bottom: 14px;
}
.group h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}
.hint {
  margin: 2px 0 8px;
  color: var(--muted);
  font-size: 12px;
}
.mods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mod {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-size: 12px;
  cursor: pointer;
}
.mod.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.mod:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.mod-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
}
.mod-bar .btn {
  height: 26px;
  font-size: 12px;
  padding: 0 8px;
}
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  min-height: 78px;
}
.action:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.action b {
  font-size: 13px;
  color: var(--ink);
}
.action em {
  font-size: 12px;
  font-style: normal;
  color: var(--muted);
  line-height: 1.4;
}
.jd-label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
.mb {
  margin-bottom: 12px;
}
.thread-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
}
.thread-head .btn {
  height: 28px;
  font-size: 12px;
  font-weight: 400;
}
.thread {
  min-height: 140px;
  max-height: 30vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.empty {
  color: var(--muted);
  font-size: 13px;
  padding: 16px 8px;
  line-height: 1.55;
}
.bubble {
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: var(--chip);
}
.bubble.user {
  background: var(--accent-soft);
  align-self: flex-end;
  max-width: 92%;
}
.bubble pre {
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}
.loading {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
.patch {
  margin-top: 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
}
.patch-lead {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--muted);
}
.patch-block {
  margin-bottom: 8px;
}
.patch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.patch-block h4 {
  margin: 0;
  font-size: 12px;
  color: var(--accent);
}
.patch-head .btn {
  height: 24px;
  font-size: 12px;
  padding: 0 8px;
}
.patch-block ul {
  margin: 4px 0 0;
  padding-left: 1.1em;
}
.patch-block li {
  margin: 0 0 2px;
  line-height: 1.45;
}
.patch-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
