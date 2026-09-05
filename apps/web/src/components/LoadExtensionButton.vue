<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { getExtensionStatus, loadExtension, type ExtensionStatus } from "../api";

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    plain?: boolean;
    label?: string;
  }>(),
  {
    compact: false,
    plain: false,
    label: "加载扩展",
  },
);

const PENDING = "qz-ext-pending";
const loading = ref(false);
const status = ref<ExtensionStatus | null>(null);

function browserHint(): "chrome" | "edge" | undefined {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua)) return "chrome";
  return undefined;
}

async function refresh() {
  try {
    status.value = await getExtensionStatus();
  } catch {
    status.value = null;
  }
}

async function load() {
  try {
    await ElMessageBox.confirm(
      "确定将「秋招网申助手」加载到当前 Chrome？加载后可在任意网申页预填，不会自动提交。若无法直接写入，会短暂重新打开 Chrome（标签会恢复）。",
      "加载扩展",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "info" },
    );
  } catch {
    return;
  }

  loading.value = true;
  sessionStorage.setItem(PENDING, "1");
  try {
    if (status.value && !status.value.built) {
      ElMessage.info("首次加载会先构建扩展，请稍候");
    }
    const result = await loadExtension({ browser: browserHint() });
    await refresh();
    if (result.already || result.installed) {
      sessionStorage.removeItem(PENDING);
      ElMessage.success("扩展已加载成功");
      return;
    }
    if (result.restarting) {
      ElMessage.success("扩展正在加载到 Chrome，窗口会很快重新打开");
      return;
    }
    sessionStorage.removeItem(PENDING);
    ElMessage.success("扩展已加载成功");
  } catch (error) {
    if (!sessionStorage.getItem(PENDING)) {
      /* already cleared */
    }
    ElMessage.error(error instanceof Error ? error.message : "加载扩展失败");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refresh();
  const injected = document.documentElement.getAttribute("data-qiuzhao-ext") === "1";
  if (sessionStorage.getItem(PENDING) && (status.value?.installed || injected)) {
    sessionStorage.removeItem(PENDING);
    ElMessage.success("扩展已加载成功");
  }
});
</script>

<template>
  <button
    type="button"
    class="btn"
    :class="{ compact, 'btn-primary': !compact && !plain }"
    :disabled="loading"
    :title="status?.installed ? '扩展已在当前 Chrome 中' : '加载到当前 Chrome'"
    @click="load"
  >
    {{ loading ? "正在加载…" : status?.installed ? "扩展已加载" : label }}
  </button>
</template>

<style scoped>
.compact {
  height: 32px;
  padding: 0 12px;
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent-2);
  font-size: 13px;
}
.compact:hover:not(:disabled) {
  background: #dbeafe;
}
</style>
