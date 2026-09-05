<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { prefillBookmarklet } from "../prefill";

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    plain?: boolean;
    label?: string;
  }>(),
  {
    compact: false,
    plain: false,
    label: "启用预填",
  },
);

async function enable() {
  try {
    await ElMessageBox.confirm(
      "确定在当前 Chrome 启用网申预填？不会安装扩展、不会重启浏览器。演示页可直接点「秋招预填」；其它网站把书签栏里的「秋招预填」点一下即可。",
      "启用预填",
      { confirmButtonText: "确定", cancelButtonText: "取消", type: "info" },
    );
  } catch {
    return;
  }
  try {
    await navigator.clipboard.writeText(prefillBookmarklet());
  } catch {
    /* still succeed; user can drag from settings */
  }
  ElMessage.success("预填已启用");
  try {
    await ElMessageBox.confirm("书签代码已复制。打开演示页可立刻试用；以后在任意网申页点书签「秋招预填」。", "预填已启用", {
      confirmButtonText: "打开演示页",
      cancelButtonText: "关闭",
      type: "success",
    });
    window.open("/apply-demo.html", "_blank", "noopener");
  } catch {
    /* closed */
  }
}
</script>

<template>
  <button
    type="button"
    class="btn"
    :class="{ compact, 'btn-primary': !compact && !plain }"
    title="在当前页预填，不安装 Chrome 扩展"
    @click="enable"
  >
    {{ label }}
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
