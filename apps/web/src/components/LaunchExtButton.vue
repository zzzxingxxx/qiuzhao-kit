<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { getExtensionStatus, launchExtensionBrowser, type ExtensionStatus } from "../api";

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    /** demo = 本地申请表；home = 工作台 */
    target?: "demo" | "home";
    label?: string;
    plain?: boolean;
  }>(),
  {
    compact: false,
    target: "demo",
    label: "打开预填浏览器",
    plain: false,
  },
);

const launching = ref(false);
const status = ref<ExtensionStatus | null>(null);

const startUrl = computed(() => {
  const origin = window.location.origin;
  return props.target === "home" ? `${origin}/` : `${origin}/apply-demo.html`;
});

async function refresh() {
  try {
    status.value = await getExtensionStatus();
  } catch {
    status.value = null;
  }
}

async function launch() {
  launching.value = true;
  try {
    if (status.value && !status.value.built) {
      ElMessage.info("首次打开会先构建扩展，请稍候");
    }
    const result = await launchExtensionBrowser({ url: startUrl.value });
    ElMessage.success(
      result.rebuilt
        ? `已构建并打开 ${result.browser}，扩展已装好。在新窗口点工具栏「秋招网申助手」。`
        : `已打开 ${result.browser}，扩展已装好。在新窗口点工具栏「秋招网申助手」预填。`,
    );
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "打开预填浏览器失败");
  } finally {
    launching.value = false;
  }
}

onMounted(refresh);

defineExpose({ status, refresh });
</script>

<template>
  <button
    type="button"
    class="btn"
    :class="{ compact, 'btn-primary': !compact && !plain }"
    :disabled="launching"
    :title="status?.browser ? `用 ${status.browser.name} 打开已加载扩展的窗口` : '打开已加载扩展的预填窗口'"
    @click="launch"
  >
    {{ launching ? (status && !status.built ? "正在构建…" : "正在打开…") : label }}
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
