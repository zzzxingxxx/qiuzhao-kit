<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  AI_ACTION_HINTS,
  AI_ACTION_LABELS,
  type AiChatAction,
  type AiChatMessage,
  type AiPatch,
} from "@qiuzhao/schema";
import { chatAi, getAiSettings } from "../api";
import { activeResume, aiDrawerOpen, aiReady, applyAiPatch } from "../ai-ui";

type Bubble = { role: "user" | "assistant"; content: string; patch?: AiPatch | null };

type ActionCard = { id: AiChatAction; needsJd?: boolean; writes?: boolean };

const router = useRouter();
const loading = ref(false);
const input = ref("");
const jobDesc = ref("");
const messages = ref<Bubble[]>([]);
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

function extractPatch(text: string): AiPatch | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as AiPatch;
    if (obj.summary || obj.internships?.length || obj.projects?.length || obj.campus?.length) return obj;
  } catch {
    return null;
  }
  return null;
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

function previewBlocks(patch: AiPatch): { title: string; lines: string[] }[] {
  const blocks: { title: string; lines: string[] }[] = [];
  if (patch.summary?.trim()) {
    blocks.push({ title: "自我评价", lines: [patch.summary.trim()] });
  }
  const groups: { kind: "internships" | "projects" | "campus"; title: string }[] = [
    { kind: "internships", title: "实习经历" },
    { kind: "projects", title: "项目经历" },
    { kind: "campus", title: "校园经历" },
  ];
  for (const group of groups) {
    for (const item of patch[group.kind] ?? []) {
      const lines = (item.bullets ?? []).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) continue;
      blocks.push({ title: `${group.title} · ${expLabel(group.kind, item.id)}`, lines });
    }
  }
  return blocks;
}

watch(aiDrawerOpen, async (open) => {
  if (!open) return;
  try {
    const settings = await getAiSettings();
    aiReady.value = settings.hasKey;
  } catch {
    aiReady.value = false;
  }
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
  if (action !== "chat") {
    messages.value.push({ role: "user", content: text || AI_ACTION_LABELS[action] });
  } else {
    messages.value.push({ role: "user", content: text });
    input.value = "";
  }

  const history: AiChatMessage[] = messages.value.slice(0, -1).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  loading.value = true;
  try {
    const result = await chatAi({
      action,
      prompt: action === "chat" ? text : text || AI_ACTION_LABELS[action],
      messages: history,
      jobDesc: jobDesc.value.trim() || undefined,
      resume: activeResume.value ?? undefined,
    });
    const content = result.content || "（空回复）";
    messages.value.push({
      role: "assistant",
      content,
      patch: extractPatch(content),
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "助手调用失败");
  } finally {
    loading.value = false;
  }
}

function apply(patch: AiPatch) {
  if (!applyAiPatch.value) {
    ElMessage.warning("请打开简历页再应用改写");
    return;
  }
  applyAiPatch.value(patch);
  ElMessage.success("已写入当前简历，请核对预览后保存");
}

function discard(msg: Bubble) {
  msg.patch = null;
}

function clearThread() {
  messages.value = [];
}
</script>

<template>
  <el-drawer v-model="aiDrawerOpen" size="480px" class="no-print" append-to-body>
    <template #header>
      <div class="head">
        <strong>AI 简历助手</strong>
        <span>本机转发 · 默认 SpaceXAI · 改写需你点「应用到简历」</span>
      </div>
    </template>

    <p class="lead">不会编造公司、数字或没写过的经历。密钥只存在本机服务，不会打进浏览器包。</p>
    <div v-if="!configured" class="warn">尚未配置密钥。到「设置」填写地址和 Key，再点拉取模型。</div>

    <section class="group">
      <h3>改写简历</h3>
      <p class="hint">生成可核对的补丁，不会自动覆盖原文。</p>
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
      <p class="hint">只出文字建议，不改简历内容。</p>
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
        先选一项改写或诊断，或在下方针对某一条提问。例如：「把第一段实习的第二点写得更向量化」。
      </div>
      <div v-for="(msg, i) in messages" :key="i" class="bubble" :class="msg.role">
        <pre v-if="displayText(msg)">{{ displayText(msg) }}</pre>
        <div v-if="msg.patch" class="patch">
          <p class="patch-lead">可应用到简历的改写，请先核对：</p>
          <div v-for="(block, bi) in previewBlocks(msg.patch)" :key="bi" class="patch-block">
            <h4>{{ block.title }}</h4>
            <ul>
              <li v-for="(line, li) in block.lines" :key="li">{{ line }}</li>
            </ul>
          </div>
          <div class="patch-actions">
            <button type="button" class="btn btn-primary" @click="apply(msg.patch)">应用到简历</button>
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
        placeholder="自由提问，例如：校园经历要不要删掉？Ctrl+Enter 发送"
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
  min-height: 160px;
  max-height: 34vh;
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
.patch-block h4 {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--accent);
}
.patch-block ul {
  margin: 0;
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
