<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  type AiModelItem,
  type AiSettingsPublic,
} from "@qiuzhao/schema";
import { fetchAiModels, getAiSettings, saveAiSettings } from "../api";
import { aiReady } from "../ai-ui";

const loading = ref(false);
const saving = ref(false);
const fetching = ref(false);
const settings = ref<AiSettingsPublic | null>(null);
const baseUrl = ref(DEFAULT_AI_BASE_URL);
const apiKey = ref("");
const model = ref(DEFAULT_AI_MODEL);
const models = ref<AiModelItem[]>([]);
const showKey = ref(false);

async function load() {
  loading.value = true;
  try {
    settings.value = await getAiSettings();
    baseUrl.value = settings.value.baseUrl;
    model.value = settings.value.model || DEFAULT_AI_MODEL;
    apiKey.value = "";
    aiReady.value = settings.value.hasKey;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "读取设置失败");
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    settings.value = await saveAiSettings({
      baseUrl: baseUrl.value.trim() || DEFAULT_AI_BASE_URL,
      apiKey: apiKey.value.trim() || undefined,
      model: model.value.trim() || DEFAULT_AI_MODEL,
    });
    apiKey.value = "";
    aiReady.value = settings.value.hasKey;
    ElMessage.success("已保存到本机");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存失败");
  } finally {
    saving.value = false;
  }
}

async function pullModels() {
  fetching.value = true;
  try {
    if (apiKey.value.trim() || baseUrl.value.trim() !== settings.value?.baseUrl) {
      await save();
    }
    const data = await fetchAiModels();
    models.value = data.items;
    if (!model.value && data.items[0]) model.value = data.items[0].id;
    if (model.value && !data.items.some((item) => item.id === model.value) && data.items[0]) {
      ElMessage.info(`当前模型不在列表中，可改选。已拉到 ${data.items.length} 个`);
    } else {
      ElMessage.success(`已拉取 ${data.items.length} 个模型`);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "拉取模型失败");
  } finally {
    fetching.value = false;
  }
}

async function clearKey() {
  saving.value = true;
  try {
    settings.value = await saveAiSettings({
      baseUrl: baseUrl.value.trim() || DEFAULT_AI_BASE_URL,
      model: model.value.trim() || DEFAULT_AI_MODEL,
      clearKey: true,
    });
    aiReady.value = settings.value.hasKey;
    ElMessage.success(settings.value.usingEnvKey ? "已清除网页密钥，仍可使用环境变量 XAI_API_KEY" : "已清除密钥");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div v-loading="loading" class="page-card settings">
    <h2>AI 助手</h2>
    <p class="hint">
      兼容 OpenAI 的 <code>/v1</code> 接口：保存后点「拉取模型」，会请求
      <code>{Base URL}/models</code>。默认 {{ DEFAULT_AI_PROVIDER }}，地址
      <code>{{ DEFAULT_AI_BASE_URL }}</code>，模型 <code>{{ DEFAULT_AI_MODEL }}</code>。
      也可填本地 Ollama / LM Studio，例如 <code>http://127.0.0.1:11434/v1</code>。
    </p>

    <el-form label-width="108px" class="form">
      <el-form-item label="接口地址">
        <el-input v-model="baseUrl" placeholder="https://api.x.ai/v1" />
      </el-form-item>
      <el-form-item label="API Key">
        <el-input
          v-model="apiKey"
          :type="showKey ? 'text' : 'password'"
          autocomplete="off"
          placeholder="留空则保持已保存的密钥"
        >
          <template #append>
            <el-button @click="showKey = !showKey">{{ showKey ? "隐藏" : "显示" }}</el-button>
          </template>
        </el-input>
        <p v-if="settings?.hasKey" class="meta">
          已保存 {{ settings.keyHint }}
          <span v-if="settings.usingEnvKey">（来自环境变量 XAI_API_KEY）</span>
        </p>
      </el-form-item>
      <el-form-item label="模型">
        <el-select
          v-model="model"
          filterable
          allow-create
          default-first-option
          placeholder="先拉取模型，或手动填写"
          style="width: 100%"
        >
          <el-option v-for="item in models" :key="item.id" :label="item.id" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        <el-button :loading="fetching" @click="pullModels">拉取模型</el-button>
        <el-button :disabled="!settings?.hasKey" @click="clearKey">清除密钥</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      type="info"
      :closable="false"
      title="密钥只存在本机 SQLite（apps/server/data/app.db），不会进 Git 或前端包。"
    />
  </div>
</template>

<style scoped>
.settings h2 {
  margin: 0 0 8px;
}
.hint {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 20px;
  max-width: 760px;
}
.form {
  max-width: 640px;
}
.meta {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
}
code {
  font-size: 12px;
  background: var(--chip);
  padding: 1px 5px;
  border-radius: 4px;
}
</style>
