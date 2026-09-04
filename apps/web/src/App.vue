<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getAiSettings, getHealth, type Health } from "./api";
import { aiDrawerOpen, aiReady } from "./ai-ui";
import AiAssistant from "./components/AiAssistant.vue";

const route = useRoute();
const health = ref<Health | null>(null);
const healthError = ref("");

const nav = [
  { to: "/", label: "工作台", match: (p: string) => p === "/" },
  { to: "/profile", label: "档案", match: (p: string) => p.startsWith("/profile") },
  { to: "/resume", label: "简历", match: (p: string) => p.startsWith("/resume") },
  { to: "/board", label: "看板", match: (p: string) => p.startsWith("/board") },
  { to: "/settings", label: "设置", match: (p: string) => p.startsWith("/settings") },
];

const title = computed(() => String(route.meta.title ?? "秋招网申助手"));
const hint = computed(() => String(route.meta.hint ?? ""));
const showAiButton = computed(() => route.path === "/resume");

onMounted(async () => {
  try {
    health.value = await getHealth();
  } catch (error) {
    healthError.value = error instanceof Error ? error.message : "本机服务未连接";
  }
  try {
    const settings = await getAiSettings();
    aiReady.value = settings.hasKey;
  } catch {
    aiReady.value = false;
  }
});
</script>

<template>
  <div class="shell">
    <aside class="sidebar no-print">
      <div class="brand">
        <span class="mark">秋</span>
        <div>
          <strong>秋招网申助手</strong>
          <span>本机优先 · 预填不代投</span>
        </div>
      </div>
      <nav>
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: item.match(route.path) }"
        >
          {{ item.label }}
        </router-link>
      </nav>
      <div class="side-foot">
        <div class="pill" :class="{ on: aiReady }">
          AI {{ aiReady ? "已配置" : "未配置" }}
        </div>
        <div class="status" :class="{ ok: health?.ok, bad: !health?.ok }">
          <span class="dot" />
          <span v-if="health?.ok">本机服务已连接</span>
          <span v-else>本机服务未连接</span>
          <small v-if="healthError">{{ healthError }}</small>
        </div>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar no-print">
        <div>
          <h1>{{ title }}</h1>
          <p>{{ hint }}</p>
        </div>
        <div class="top-actions">
          <el-button v-if="showAiButton" type="primary" @click="aiDrawerOpen = true">AI 助手</el-button>
          <el-button v-else @click="aiDrawerOpen = true">AI 助手</el-button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
    <AiAssistant />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 228px 1fr;
  min-height: 100vh;
}
.sidebar {
  background: var(--side);
  color: #e2e8f0;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.brand {
  display: flex;
  gap: 10px;
  align-items: center;
}
.mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.brand strong {
  display: block;
  font-size: 15px;
}
.brand span {
  display: block;
  margin-top: 3px;
  color: var(--side-text);
  font-size: 12px;
}
.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 10px;
  color: #cbd5e1;
  margin-bottom: 6px;
}
.nav-item.active,
.nav-item:hover {
  background: var(--side-active);
  color: #fff;
}
.side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pill {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #1e293b;
  color: #94a3b8;
  width: fit-content;
}
.pill.on {
  background: #134e4a;
  color: #99f6e4;
}
.status {
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #cbd5e1;
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
  color: var(--side-text);
  word-break: break-all;
}
.workspace {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 22px 28px 0;
}
.topbar h1 {
  margin: 0 0 6px;
  font-size: 26px;
  letter-spacing: 0.02em;
}
.topbar p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  max-width: 720px;
}
.content {
  padding: 20px 28px 36px;
}
@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
  .side-foot {
    margin-top: 0;
    width: 100%;
  }
}
</style>
