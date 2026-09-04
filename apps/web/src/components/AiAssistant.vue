<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  AI_ACTION_LABELS,
  type AiChatAction,
  type AiChatMessage,
  type AiPatch,
} from "@qiuzhao/schema";
import { chatAi, getAiSettings } from "../api";
import { activeResume, aiDrawerOpen, aiReady, applyAiPatch } from "../ai-ui";

type Bubble = { role: "user" | "assistant"; content: string; patch?: AiPatch | null };

const router = useRouter();
const loading = ref(false);
const input = ref("");
const jobDesc = ref("");
const messages = ref<Bubble[]>([]);
const configured = computed(() => aiReady.value);

const actions: { id: AiChatAction; hint: string }[] = [
  { id: "polish", hint: "润色实习 / 项目要点" },
  { id: "summary", hint: "生成自我评价" },
  { id: "match", hint: "按岗位描述改写" },
  { id: "chat", hint: "自由提问" },
];

function extractPatch(text: string): AiPatch | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as AiPatch;
    if (obj.summary || obj.internships?.length || obj.projects?.length) return obj;
  } catch {
    return null;
  }
  return null;
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
  if (action === "match" && !jobDesc.value.trim()) {
    ElMessage.warning("请先粘贴岗位描述");
    return;
  }
  if (action !== "chat") {
    const label = AI_ACTION_LABELS[action];
    messages.value.push({ role: "user", content: text || label });
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
    messages.value.push({
      role: "assistant",
      content: result.content || "（空回复）",
      patch: extractPatch(result.content),
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
  ElMessage.success("已写入当前简历，请核对后保存");
}
</script>

<template>
  <el-drawer
    v-model="aiDrawerOpen"
    title="AI 助手"
    size="400px"
    class="ai-drawer no-print"
    :append-to-body="true"
  >
    <p class="lead">
      自定义 OpenAI 兼容地址与密钥，本机服务代发请求。默认 SpaceXAI（xAI）。密钥不会出现在浏览器打包里。
    </p>
    <el-alert
      v-if="!configured"
      type="warning"
      :closable="false"
      title="尚未配置密钥"
      description="到「设置」填写 Base URL 和 API Key，点「拉取模型」后再用。"
      class="mb"
    />
    <div class="chips">
      <el-button
        v-for="item in actions"
        :key="item.id"
        size="small"
        :disabled="loading || (item.id !== 'chat' && !activeResume)"
        @click="run(item.id)"
      >
        {{ item.hint }}
      </el-button>
    </div>
    <el-input
      v-model="jobDesc"
      class="mb"
      type="textarea"
      :rows="3"
      placeholder="可选：粘贴 JD，用于「按岗位描述改写」"
    />
    <div class="thread">
      <div v-if="!messages.length" class="empty">问一句，或点上面的快捷改写。助手不会编造你没写过的经历。</div>
      <div v-for="(msg, i) in messages" :key="i" class="bubble" :class="msg.role">
        <pre>{{ msg.content }}</pre>
        <el-button v-if="msg.patch" size="small" type="primary" @click="apply(msg.patch)">应用到简历</el-button>
      </div>
    </div>
    <div class="composer">
      <el-input
        v-model="input"
        type="textarea"
        :rows="3"
        placeholder="例如：把第一段实习写得更量化"
        @keydown.enter.ctrl="run('chat')"
      />
      <el-button type="primary" :loading="loading" :disabled="!input.trim()" @click="run('chat')">发送</el-button>
    </div>
  </el-drawer>
</template>

<style scoped>
.lead {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.mb {
  margin-bottom: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.thread {
  min-height: 220px;
  max-height: 42vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.empty {
  color: var(--muted);
  font-size: 13px;
  padding: 24px 8px;
}
.bubble {
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: var(--chip);
}
.bubble.user {
  background: #ccfbf1;
  align-self: flex-end;
}
.bubble pre {
  white-space: pre-wrap;
  margin: 0 0 8px;
  font-family: inherit;
}
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
