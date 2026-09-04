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
  <div v-loading="loading" class="page">
    <header class="page-head">
      <div>
        <h1>设置</h1>
        <p>AI 助手走 OpenAI 兼容接口。密钥只存在本机 SQLite，不会进前端打包。</p>
      </div>
    </header>

    <section class="surface sheet">
      <h2>AI 助手</h2>
      <p class="hint">
        保存后点「拉取模型」，会请求 <code>{Base URL}/models</code>。默认 {{ DEFAULT_AI_PROVIDER }}：
        <code>{{ DEFAULT_AI_BASE_URL }}</code> / <code>{{ DEFAULT_AI_MODEL }}</code>。
        本地可填 <code>http://127.0.0.1:11434/v1</code>。
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
          <el-select v-model="model" filterable allow-create default-first-option placeholder="先拉取模型，或手动填写" style="width: 100%">
            <el-option v-for="item in models" :key="item.id" :label="item.id" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="save">保存</button>
          <button type="button" class="btn" :disabled="fetching" @click="pullModels" style="margin-left: 8px">拉取模型</button>
          <button type="button" class="btn btn-ghost" :disabled="!settings?.hasKey" @click="clearKey">清除密钥</button>
        </el-form-item>
      </el-form>
      <p class="hint">密钥文件：apps/server/data/app.db。同一套密钥也用于网申预填对照。</p>
    </section>

    <section class="surface sheet ext">
      <h2>网申预填</h2>
      <p class="hint">
        用扩展打开任意带标签的申请表，点「预填此页」。对照在本机完成，确认后只写入输入框，不点提交、不读密码。
        演示页：
        <a href="/apply-demo.html" target="_blank" rel="noreferrer">青梧科技校园招聘申请表</a>
        （不是北森）。未配置密钥时仍可用姓名 / 手机 / 邮箱等规则对照。
      </p>
    </section>
  </div>
</template>

<style scoped>
.sheet {
  padding: 24px 28px 28px;
  max-width: 720px;
}
.sheet h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.form {
  margin-top: 8px;
}
.meta {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.ext {
  margin-top: 16px;
}
.ext a {
  color: var(--accent);
}
</style>
