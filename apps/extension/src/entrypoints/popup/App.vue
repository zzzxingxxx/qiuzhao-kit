<script setup lang="ts">
import { onMounted, ref } from "vue";

const SERVER = "http://127.0.0.1:8787";
const ok = ref<boolean | null>(null);
const detail = ref("正在检查本机服务…");

onMounted(async () => {
  try {
    const res = await fetch(`${SERVER}/health`);
    const data = await res.json();
    ok.value = Boolean(data.ok);
    detail.value = ok.value ? `已连接 · ${data.service}` : "服务响应异常";
  } catch {
    ok.value = false;
    detail.value = "未连接。请先运行 pnpm dev:server 或 start.bat";
  }
});
</script>

<template>
  <div class="box">
    <h1>秋招网申助手</h1>
    <p class="state" :class="{ on: ok === true, off: ok === false }">
      {{ ok === true ? "本机服务已连接" : ok === false ? "本机服务未连接" : "检查中" }}
    </p>
    <p class="detail">{{ detail }}</p>
    <p class="hint">W1 只做连通性。预填从 W4 开始，提交永远由你亲手点。</p>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  width: 280px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}
.box {
  padding: 16px;
  background: #fffaf3;
  color: #1f1b16;
}
h1 {
  margin: 0 0 8px;
  font-size: 16px;
}
.state {
  font-weight: 600;
}
.state.on {
  color: #2f7d32;
}
.state.off {
  color: #c62828;
}
.detail,
.hint {
  font-size: 12px;
  color: #6f675c;
  line-height: 1.5;
}
</style>
