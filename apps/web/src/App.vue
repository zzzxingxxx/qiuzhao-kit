<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getHealth, type Health } from "./api";

const route = useRoute();
const health = ref<Health | null>(null);
const healthError = ref("");

const nav = [
  { to: "/profile", label: "档案" },
  { to: "/resume", label: "简历" },
  { to: "/board", label: "看板" },
];

onMounted(async () => {
  try {
    health.value = await getHealth();
  } catch (error) {
    healthError.value = error instanceof Error ? error.message : "本机服务未连接";
  }
});
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <strong>秋招网申助手</strong>
        <span>本机优先 · 预填不代投</span>
      </div>
      <nav>
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.path === item.to }"
        >
          {{ item.label }}
        </router-link>
      </nav>
      <div class="status" :class="{ ok: health?.ok, bad: !health?.ok }">
        <span class="dot" />
        <span v-if="health?.ok">本机服务已连接</span>
        <span v-else>本机服务未连接</span>
        <small v-if="healthError">{{ healthError }}</small>
      </div>
    </aside>
    <main class="main">
      <header class="top">
        <h1>{{ route.meta.title }}</h1>
        <p>档案可编辑；简历可一页预览并导出 PDF。网申预填从 W4 开始。</p>
      </header>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.side {
  background: #2b241c;
  color: #f6efe4;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.brand strong {
  display: block;
  font-size: 18px;
}
.brand span {
  display: block;
  margin-top: 6px;
  color: #cbbba6;
  font-size: 12px;
}
.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #ddd2c3;
  margin-bottom: 6px;
}
.nav-item.active,
.nav-item:hover {
  background: #3d3328;
  color: #fff;
}
.status {
  margin-top: auto;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  background: #c45c26;
}
.status.ok .dot {
  background: #7dba6a;
}
.status.bad .dot {
  background: #d15b4b;
}
.status small {
  color: #cbbba6;
  word-break: break-all;
}
.main {
  padding: 28px 36px;
}
.top h1 {
  margin: 0 0 8px;
  font-size: 28px;
}
.top p {
  margin: 0 0 24px;
  color: var(--muted);
}
</style>
