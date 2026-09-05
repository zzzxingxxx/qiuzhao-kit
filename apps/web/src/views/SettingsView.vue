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
import { fetchAiModels, getAiSettings, getExtensionStatus, saveAiSettings, type ExtensionStatus } from "../api";
import { aiReady } from "../ai-ui";
import LoadExtensionButton from "../components/LoadExtensionButton.vue";

const loading = ref(false);
const saving = ref(false);
const fetching = ref(false);
const settings = ref<AiSettingsPublic | null>(null);
const baseUrl = ref(DEFAULT_AI_BASE_URL);
const apiKey = ref("");
const model = ref(DEFAULT_AI_MODEL);
const models = ref<AiModelItem[]>([]);
const showKey = ref(false);
const extStatus = ref<ExtensionStatus | null>(null);

async function loadExt() {
  try {
    extStatus.value = await getExtensionStatus();
  } catch {
    extStatus.value = null;
  }
}

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

onMounted(() => {
  void load();
  void loadExt();
});
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
        点「加载扩展」，再点确定，扩展会装进你正在用的 Chrome。然后打开任意网申页，点工具栏「秋招网申助手」→「预填此页」。
        确认后只写入输入框，不点提交、不读密码。
      </p>
      <div class="ext-actions">
        <LoadExtensionButton />
      </div>
      <ul v-if="extStatus" class="ext-facts">
        <li>
          <b>浏览器</b>
          <span>{{ extStatus.browser ? extStatus.browser.name : "未找到 Chrome" }}</span>
        </li>
        <li>
          <b>扩展</b>
          <span>{{ extStatus.installed ? "已加载成功" : extStatus.built ? "未加载，点按钮后确定即可" : "首次加载时会自动构建" }}</span>
        </li>
      </ul>
      <p class="hint">
        档案没有的题可以在扩展里补，或先在网页上填再「从本页同步」。演示页：
        <a href="/apply-demo.html" target="_blank" rel="noreferrer">青梧科技校园招聘申请表</a>
        。未配置密钥时仍可用姓名 / 手机 / 邮箱等规则对照。
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
.ext-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.ext-facts {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0;
  margin: 0 0 12px;
}
.ext-facts li {
  background: var(--chip);
  border-radius: 10px;
  padding: 10px 12px;
}
.ext-facts b {
  display: block;
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}
.ext-facts span {
  font-size: 13px;
}
</style>
